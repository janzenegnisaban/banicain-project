-- Migration: Set up Row Level Security (RLS) policies for users table (FIXED - no recursion)
-- Run this in Supabase SQL editor to fix the infinite recursion issue

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Service role can manage all users" on public.users;
drop policy if exists "Authenticated users can read all users" on public.users;
drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Authenticated users can insert users" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Administrators can manage all users" on public.users;
drop policy if exists "Public can read active users" on public.users;

-- Drop the helper function if it exists
drop function if exists public.is_administrator();

-- Enable RLS on users table
alter table public.users enable row level security;

-- Helper function to check if current user is an administrator
-- Uses SECURITY DEFINER to bypass RLS and avoid recursion
create or replace function public.is_administrator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
    and role = 'Administrator'
  );
$$;

-- Policy 1: Allow service role (server-side) to do everything
-- This bypasses RLS for server-side operations using service role key
create policy "Service role can manage all users"
  on public.users
  for all
  using (true)
  with check (true);

-- Policy 2: Allow authenticated users to read all users
-- Needed for the users management page
create policy "Authenticated users can read all users"
  on public.users
  for select
  to authenticated
  using (true);

-- Policy 3: Allow authenticated users to insert their own profile
-- Needed for signup flow - user creates profile after auth signup
create policy "Users can insert their own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Policy 4: Allow authenticated users to update their own profile
create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policy 5: Allow administrators to manage all users (using helper function to avoid recursion)
-- This allows admins to create/update/delete any user
create policy "Administrators can manage all users"
  on public.users
  for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

-- Policy 6: Allow anon/public to read active users (optional - comment out if not needed)
create policy "Public can read active users"
  on public.users
  for select
  to anon
  using (is_active = true);

-- Note: 
-- - Server-side code should use SUPABASE_KEY (service role) to bypass RLS
-- - Client-side code uses PUBLIC_SUPABASE_ANON_KEY and is subject to these policies
-- - The is_administrator() function uses SECURITY DEFINER to avoid recursion

