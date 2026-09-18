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
