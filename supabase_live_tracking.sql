-- Live worker-location tracking for accepted requests (MVP: foreground-only,
-- straight-line ETA -- no paid directions API).
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.

alter table public.service_requests
  add column if not exists worker_current_lat double precision,
  add column if not exists worker_current_lng double precision,
  add column if not exists worker_location_updated_at timestamp with time zone;

-- Needed so clients/workers can subscribe to live UPDATEs on this table
-- (only "messages" was added to the realtime publication in the base schema).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_requests'
  ) then
    alter publication supabase_realtime add table public.service_requests;
  end if;
end $$;
