-- Enable RLS on users with policies that recognize both Administrator and Barangay Captain (super admin)

do $$
declare
  r record;
begin
  for r in (select policyname from pg_policies where tablename = 'users' and schemaname = 'public') loop
    execute format('drop policy if exists %I on public.users', r.policyname);
  end loop;
end $$;

drop function if exists public.is_administrator();

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
    and role in ('Administrator', 'Barangay Captain')
  );
$$;

alter table public.users enable row level security;

create policy "Service role can manage all users"
  on public.users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Authenticated users can read all users"
  on public.users
  for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Administrators can manage all users"
  on public.users
  for all
  to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy "Public can read active users"
  on public.users
  for select
  to anon
  using (is_active = true);
