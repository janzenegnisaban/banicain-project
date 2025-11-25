-- Migration: Set up Row Level Security (RLS) policies for users table
-- Run inside Supabase SQL editor after creating the users table

-- Enable RLS on users table
alter table public.users enable row level security;

-- Policy 1: Allow service role (server-side) to do everything
-- This is needed for API endpoints using the service role key
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
-- Needed for signup flow - allows users to create their profile after auth signup
create policy "Users can insert their own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Policy 3b: Allow inserts for any authenticated user (for admin-created accounts)
-- This is needed when admins create accounts via the API
-- The service role should handle this, but this provides a fallback
create policy "Authenticated users can insert users"
  on public.users
  for insert
  to authenticated
  with check (true);

-- Policy 4: Allow authenticated users to update their own profile
create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

-- Policy 5: Allow administrators to manage all users
-- This allows admins to create/update/delete any user
-- Uses the helper function to avoid recursion
create policy "Administrators can manage all users"
  on public.users
  for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

-- Policy 6: Allow anon/public to read users (for public pages if needed)
-- Comment this out if you want to restrict user data to authenticated users only
create policy "Public can read active users"
  on public.users
  for select
  to anon
  using (is_active = true);

-- Note: The service role policy above should handle all server-side operations.
-- If you're still getting RLS errors, make sure your server-side code is using
-- the service role key (SUPABASE_KEY) and not the anon key (PUBLIC_SUPABASE_ANON_KEY).

