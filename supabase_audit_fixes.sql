-- Fixes from the post-launch audit (everything except payments/escrow).
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Clients can cancel their own requests (previously only workers could
--    update a service_request at all -- a client had no way to back out of
--    a pending or accepted booking).
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "Clients can cancel their own requests" on public.service_requests;
create policy "Clients can cancel their own requests"
  on public.service_requests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Reviews now require a completed job with that worker -- previously
--    anyone could review anyone, with no relationship to an actual booking.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "Users can insert their own reviews" on public.reviews;
create policy "Users can insert their own reviews"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.service_requests sr
      where sr.worker_id = reviews.worker_id
        and sr.user_id = auth.uid()
        and sr.status = 'completed'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Saved favorites (worker bookmarking).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, worker_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users manage their own favorites" on public.favorites;
create policy "Users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Real worker portfolio photos (previously hardcoded stock images in the
--    app -- every worker showed the same fake gallery).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.workers
  add column if not exists portfolio_urls text[] not null default '{}';

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Push notification tokens (Expo push tokens, one per device/session).
--    A user can have more than one (multiple devices), hence its own table
--    rather than a single column on public.users.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  token text primary key,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage their own push tokens" on public.push_tokens;
create policy "Users manage their own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Report / block users.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete set null,
  reported_worker_id uuid references public.workers(id) on delete set null,
  reason text not null,
  details text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.user_reports enable row level security;

drop policy if exists "Users can file reports" on public.user_reports;
create policy "Users can file reports"
  on public.user_reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own filed reports" on public.user_reports;
create policy "Users can view their own filed reports"
  on public.user_reports for select
  using (auth.uid() = reporter_id);

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

-- SELECT is visible to both sides of a block (not just the blocker) — the
-- app needs to mutually hide/disable contact for whichever side is blocked,
-- which means the blocked party also needs to be able to see that the block
-- exists. Only the blocker can create/remove it, though.
drop policy if exists "Users manage their own block list" on public.blocked_users;
drop policy if exists "Users can view blocks involving them" on public.blocked_users;
create policy "Users can view blocks involving them"
  on public.blocked_users for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can create their own blocks" on public.blocked_users;
create policy "Users can create their own blocks"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can remove their own blocks" on public.blocked_users;
create policy "Users can remove their own blocks"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- Blocked users can no longer message each other. Messages RLS is extended
-- (not replaced) so this only ever restricts, never widens, access.
drop policy if exists "Users can insert their own messages" on public.messages;
create policy "Users can insert their own messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = messages.receiver_id and b.blocked_id = messages.sender_id)
         or (b.blocker_id = messages.sender_id and b.blocked_id = messages.receiver_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 7. One worker profile per account. There was no unique constraint on
--    workers.user_id, and registration did a plain insert (not upsert) --
--    a double-tap, a retry after a slow photo upload, or re-registering
--    after an interrupted session could all create a second workers row
--    for the same user. Every "is this user a worker" check in the app
--    uses .single()/.maybeSingle(), which silently ERRORS when more than
--    one row matches -- so an affected seller would permanently see the
--    "Apply Now" promo instead of their dashboard, with no visible error
--    anywhere. This repairs any existing duplicates (keeping the oldest
--    row per user so earlier bookings/reviews/requests still point at a
--    row that exists, re-pointing anything that referenced a duplicate)
--    and then locks the door so it can't happen again.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  dup record;
  keep_id uuid;
begin
  for dup in
    select user_id from public.workers
    where user_id is not null
    group by user_id
    having count(*) > 1
  loop
    select id into keep_id from public.workers
      where user_id = dup.user_id
      order by created_at asc, id asc
      limit 1;

    update public.service_requests
      set worker_id = keep_id
      where worker_id in (
        select id from public.workers where user_id = dup.user_id and id <> keep_id
      );

    update public.reviews
      set worker_id = keep_id
      where worker_id in (
        select id from public.workers where user_id = dup.user_id and id <> keep_id
      );

    -- Favorites has a (user_id, worker_id) primary key, so re-pointing a
    -- duplicate's favorite onto keep_id could collide with one that
    -- already exists there -- drop those collisions first.
    delete from public.favorites f
      where f.worker_id in (
        select id from public.workers where user_id = dup.user_id and id <> keep_id
      )
      and exists (
        select 1 from public.favorites k where k.user_id = f.user_id and k.worker_id = keep_id
      );

    update public.favorites
      set worker_id = keep_id
      where worker_id in (
        select id from public.workers where user_id = dup.user_id and id <> keep_id
      );

    delete from public.workers where user_id = dup.user_id and id <> keep_id;
  end loop;
end $$;

alter table public.workers drop constraint if exists workers_user_id_key;
alter table public.workers add constraint workers_user_id_key unique (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Account deletion (required for Play Store submission -- Google
--    requires either an in-app way to delete an account or a public page
--    explaining how to request it; this is the in-app flow). Soft-delete
--    with a 30-day grace period: requesting deletion signs the user out
--    and hides their worker listing immediately, a daily job hard-deletes
--    anyone past the grace window, and logging back in during the window
--    offers a restore option instead of deleting on the spot.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.users add column if not exists deleted_at timestamp with time zone;

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Soft-deleted workers stop appearing to clients immediately, without
-- waiting for the hard-delete job.
drop policy if exists "Anyone can view workers" on public.workers;
create policy "Anyone can view workers"
  on public.workers for select
  using (
    not exists (
      select 1 from public.users u where u.id = workers.user_id and u.deleted_at is not null
    )
  );

create or replace function public.purge_deleted_accounts()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  delete from auth.users
  where id in (
    select id from public.users
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
  );
end;
$$;

-- Schedules the daily purge via pg_cron if it's available on this project.
-- If this errors (pg_cron not enabled), enable it from the Supabase
-- Dashboard under Database -> Extensions -> pg_cron, then re-run just this
-- block -- the purge_deleted_accounts() function above works either way;
-- without the schedule it just needs to be called manually/periodically.
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'purge-deleted-accounts-daily') then
    perform cron.schedule(
      'purge-deleted-accounts-daily',
      '0 3 * * *',
      $cron$ select public.purge_deleted_accounts(); $cron$
    );
  end if;
end $$;
