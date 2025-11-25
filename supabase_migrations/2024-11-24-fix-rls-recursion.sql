-- Fix RLS infinite recursion issue
-- Run this entire script in Supabase SQL editor

-- Step 1: Drop ALL existing policies on users table
do $$
declare
  r record;
begin
  for r in (select policyname from pg_policies where tablename = 'users' and schemaname = 'public') loop
    execute format('drop policy if exists %I on public.users', r.policyname);
  end loop;
end $$;

-- Step 2: Drop the helper function if it exists
drop function if exists public.is_administrator();

-- Step 3: Create the helper function (uses SECURITY DEFINER to avoid recursion)
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

-- Step 4: Create policies (now that old ones are dropped)

-- Policy 1: Service role bypasses RLS (for server-side operations)
create policy "Service role can manage all users"
  on public.users
  for all
  using (true)
  with check (true);

-- Policy 2: Authenticated users can read all users
create policy "Authenticated users can read all users"
  on public.users
  for select
  to authenticated
  using (true);

-- Policy 3: Users can insert their own profile (for signup)
create policy "Users can insert their own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Policy 4: Users can update their own profile
create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policy 5: Administrators can manage all users (no recursion thanks to helper function)
create policy "Administrators can manage all users"
  on public.users
  for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

-- Policy 6: Public can read active users (optional)
create policy "Public can read active users"
  on public.users
  for select
  to anon
  using (is_active = true);

-- Done! The recursion issue should now be fixed.

