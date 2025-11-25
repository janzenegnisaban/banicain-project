-- Fix users_role_check constraint to allow "Administrator" role
-- Run this in Supabase SQL editor

-- Step 1: Drop ALL constraints related to role (must be done FIRST before updating rows)
do $$
declare
  r record;
begin
  for r in (
    select conname 
    from pg_constraint 
    where conrelid = 'public.users'::regclass 
    and conname like '%role%'
  ) loop
    execute format('alter table public.users drop constraint if exists %I cascade', r.conname);
  end loop;
end $$;

-- Step 2: Now update any existing rows with invalid or null roles to a valid default
-- (This is safe now because the constraint is dropped)
update public.users
set role = 'Resident'
where role is null 
   or trim(role) not in (
     'Resident',
     'Police Officer',
     'Crime Analyst',
     'Police Chief',
     'Administrator'
   );

-- Step 3: Create a new constraint that allows all valid roles
alter table public.users add constraint users_role_check 
  check (role in (
    'Resident',
    'Police Officer',
    'Crime Analyst',
    'Police Chief',
    'Administrator'
  ));

-- Step 5: Verify the constraint was created correctly
-- Uncomment to check: 
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.users'::regclass 
-- AND conname = 'users_role_check';

