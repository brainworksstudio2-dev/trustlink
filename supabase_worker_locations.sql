-- Worker "current position" for nearby-worker discovery.
--
-- This is deliberately separate from service_requests.worker_current_lat/lng,
-- which already handles private, job-scoped live tracking (a customer can
-- only see a worker's live position for their own accepted job — that RLS
-- already exists via service_requests' own policies and is untouched here).
--
-- worker_locations answers a different question: "who's roughly nearby right
-- now", for browsing before any booking exists. Because that's inherently
-- broader-audience than job tracking, raw rows are NOT exposed to customers
-- at all -- there is no customer-facing SELECT policy on this table. Instead,
-- customers call the nearby_workers() function below, which runs as a
-- SECURITY DEFINER, computes distance server-side, and returns only a
-- coarsened (~100m) position plus distance -- enough to place a pin in
-- roughly the right spot, not enough to pinpoint or continuously track an
-- individual worker's exact movements.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.

create table if not exists public.worker_locations (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  speed double precision,
  accuracy double precision,
  is_sharing boolean not null default false,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.worker_locations enable row level security;

-- Workers manage only their own row. No policy grants customers direct
-- SELECT -- discovery goes through nearby_workers() instead (see below).
drop policy if exists "Workers can view their own location" on public.worker_locations;
create policy "Workers can view their own location"
  on public.worker_locations for select
  using (worker_id in (select id from public.workers where user_id = auth.uid()));

drop policy if exists "Workers can upsert their own location" on public.worker_locations;
create policy "Workers can upsert their own location"
  on public.worker_locations for insert
  with check (worker_id in (select id from public.workers where user_id = auth.uid()));

drop policy if exists "Workers can update their own location" on public.worker_locations;
create policy "Workers can update their own location"
  on public.worker_locations for update
  using (worker_id in (select id from public.workers where user_id = auth.uid()));

-- Realtime not enabled on this table on purpose: nearby-worker discovery is
-- poll-on-demand (re-run nearby_workers() when the customer opens/refreshes
-- the map), not a live subscription -- keeps this table's broad-ish read
-- surface (via the function) from doubling as a live tracking feed.

drop function if exists public.nearby_workers(double precision, double precision, double precision);

create or replace function public.nearby_workers(
  customer_lat double precision,
  customer_lng double precision,
  radius_km double precision default 25
)
returns table (
  worker_id uuid,
  name text,
  specialty text,
  category text,
  avatar_url text,
  rating numeric,
  rate text,
  distance_km double precision,
  approx_latitude double precision,
  approx_longitude double precision
)
language sql
security definer
set search_path = public
stable
as $$
  with candidates as (
    select
      w.id as worker_id,
      w.name,
      w.specialty,
      w.category,
      w.avatar_url,
      w.rating,
      w.rate,
      (
        6371 * acos(
          least(1, greatest(-1,
            cos(radians(customer_lat)) * cos(radians(wl.latitude)) *
            cos(radians(wl.longitude) - radians(customer_lng)) +
            sin(radians(customer_lat)) * sin(radians(wl.latitude))
          ))
        )
      ) as distance_km,
      -- ~100m precision: enough to place a pin, not enough to pinpoint an
      -- exact address or continuously track fine-grained movement.
      round(wl.latitude::numeric, 3)::double precision as approx_latitude,
      round(wl.longitude::numeric, 3)::double precision as approx_longitude
    from public.worker_locations wl
    join public.workers w on w.id = wl.worker_id
    where wl.is_sharing = true
      and w.available = true
      and wl.updated_at > now() - interval '30 minutes'
  )
  select * from candidates
  where distance_km <= radius_km
  order by distance_km asc
  limit 100;
$$;

-- Matches the existing "Anyone can view workers" openness on public.workers
-- (browsing already doesn't require login in this app) -- only the function
-- is exposed, never the raw table.
grant execute on function public.nearby_workers(double precision, double precision, double precision) to anon, authenticated;

-- Needed so a worker's own device gets a live update the moment they flip
-- their "Available Now" toggle (WorkerPresenceTracker reacts to this to
-- start/stop broadcasting presence -- see src/components/WorkerPresenceTracker.tsx).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workers'
  ) then
    alter publication supabase_realtime add table public.workers;
  end if;
end $$;
