-- Migration: Ensure users + reports relationships & seed officer accounts
-- Run inside Supabase SQL editor or `supabase db push`

-- 1. Create the public.users table if it doesn't exist yet
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text not null default 'Resident',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Directory of residents and barangay officers synced with Supabase Auth.';

-- 2. Ensure reports table references users via reporter_id
alter table if exists public.reports
  add column if not exists reporter_id uuid references public.users (id);

create index if not exists reports_reporter_id_idx on public.reports(reporter_id);

-- 3. Seed officer profiles (auth users must also exist; see seedOfficerAccounts helper)
insert into public.users (id, email, full_name, role, is_active)
values
  ('00000000-0000-0000-0000-0000000c1ef1', 'chief@bsafe.local', 'Chief Maria Dela Cruz', 'Police Chief', true),
  ('00000000-0000-0000-0000-0000000a1a1f', 'analyst@bsafe.local', 'Analyst Jose Ramirez', 'Crime Analyst', true),
  ('00000000-0000-0000-0000-0000000b0b0c', 'officer1@bsafe.local', 'Officer Lea Santiago', 'Police Officer', true),
  ('00000000-0000-0000-0000-0000000d1d1d', 'admin@bsafe.local', 'Administrator Carlo Reyes', 'Administrator', true)
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role,
    is_active = true;

-- 4. Seed the mock resident reporter used by demo data
insert into public.users (id, email, full_name, role, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'mock.reporter@test.com', 'Mock Reporter', 'Resident', true)
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    is_active = true;

-- After running this migration, run `bun run dev` and hit `/api/seed`
-- to populate the reports table with demo data tied to the seeded users.

