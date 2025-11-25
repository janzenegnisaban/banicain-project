-- Quick Fix: Disable RLS on users table (for development/testing only)
-- WARNING: This removes all security restrictions. Use only for development.
-- For production, use the RLS policies migration instead.

alter table public.users disable row level security;

-- If you want to re-enable RLS later with proper policies, run:
-- alter table public.users enable row level security;
-- Then run the 2024-11-24-rls-policies.sql migration

