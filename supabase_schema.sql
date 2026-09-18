-- TrustLink base schema for a fresh Supabase project.
-- Reconstructed from application usage (src/screens/*.tsx) since the repo only
-- ever contained incremental patches (supabase_booking_chat.sql, fix_rls.sql),
-- not the original CREATE TABLE statements. Review column types/defaults before
-- running against a project with existing data.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Mirror of auth.users, kept in sync via trigger.
--    Needed because PostgREST can only embed ("users:user_id(...)") against
--    a table in an exposed schema with a real foreign key -- auth.users
--    itself isn't embeddable from the client API.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  raw_user_meta_data jsonb
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, raw_user_meta_data)
  values (new.id, new.email, new.raw_user_meta_data)
  on conflict (id) do update
    set email = excluded.email,
        raw_user_meta_data = excluded.raw_user_meta_data;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_or_updated on auth.users;
create trigger on_auth_user_created_or_updated
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing auth users (no-op on a brand-new project).
insert into public.users (id, email, raw_user_meta_data)
select id, email, raw_user_meta_data from auth.users
on conflict (id) do update
  set email = excluded.email,
      raw_user_meta_data = excluded.raw_user_meta_data;

alter table public.users enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.users;
create policy "Authenticated users can view profiles"
  on public.users for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. workers
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  specialty text,
  category text,
  avatar_url text,
  identity_document_url text,
  available boolean default true,
  availability_text text,
  rate text,
  experience text,
  about_text text,
  phone_number text,
  whatsapp_number text,
  rating numeric,
  reviews integer default 0,
  tags text[],
  distance text,
  latitude double precision,
  longitude double precision,
  location_name text,
  linkedin_url text,
  instagram_url text,
  tiktok_url text,
  portfolio_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workers enable row level security;

drop policy if exists "Anyone can view workers" on public.workers;
create policy "Anyone can view workers"
  on public.workers for select
  using (true);

drop policy if exists "Users can insert their own worker profile" on public.workers;
create policy "Users can insert their own worker profile"
  on public.workers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own worker profile" on public.workers;
create policy "Users can update their own worker profile"
  on public.workers for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. service_requests
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  service_type text not null,
  description text,
  scheduled_date timestamp with time zone,
  location_address text,
  latitude double precision,
  longitude double precision,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.service_requests enable row level security;

drop policy if exists "Clients can view their own requests" on public.service_requests;
create policy "Clients can view their own requests"
  on public.service_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Clients can insert their own requests" on public.service_requests;
create policy "Clients can insert their own requests"
  on public.service_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Workers can view requests assigned to them" on public.service_requests;
create policy "Workers can view requests assigned to them"
  on public.service_requests for select
  using (
    worker_id in (
      select id from public.workers where user_id = auth.uid()
    )
  );

drop policy if exists "Workers can update requests assigned to them" on public.service_requests;
create policy "Workers can update requests assigned to them"
  on public.service_requests for update
  using (
    worker_id in (
      select id from public.workers where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 4. reviews
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.workers(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can view reviews" on public.reviews;
create policy "Anyone can view reviews"
  on public.reviews for select
  using (true);

drop policy if exists "Users can insert their own reviews" on public.reviews;
create policy "Users can insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. messages (chat)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  receiver_id uuid references public.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

drop policy if exists "Users can insert their own messages" on public.messages;
create policy "Users can insert their own messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Users can view messages they are involved in" on public.messages;
create policy "Users can view messages they are involved in"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Enable Realtime for chat.
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.messages;
