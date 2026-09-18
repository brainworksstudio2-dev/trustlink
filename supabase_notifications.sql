-- Enables reliable in-app notifications for status changes on service_requests.
--
-- service_requests already receives frequent UPDATEs from live tracking
-- (worker_current_lat/lng, roughly every 8s while a job is in progress).
-- By default Postgres only includes the primary key in a realtime UPDATE's
-- "old row" payload, so the app can't tell a real status change (pending ->
-- accepted) apart from a routine location ping. REPLICA IDENTITY FULL makes
-- Postgres include the full previous row, so the client can diff
-- payload.old.status against payload.new.status correctly.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.

alter table public.service_requests replica identity full;
