-- Supabase Auth's admin "create user" inserts the auth.users row first and writes app_metadata
-- (org_id/role set by an admin invite) in a follow-up UPDATE, so the INSERT-only trigger from 0003 never
-- saw the org and invited staff got no profile (no access). Also run on UPDATE of raw_app_meta_data.
-- Creation only: an existing profile is never changed from metadata (roles change via the Users screen).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := nullif(new.raw_app_meta_data ->> 'org_id', '')::uuid;
  v_role public.user_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'viewer')::public.user_role;
  v_hospital uuid := nullif(new.raw_app_meta_data ->> 'hospital_id', '')::uuid;
begin
  if v_org is not null and not exists (select 1 from public.profiles where user_id = new.id) then
    insert into public.profiles (user_id, org_id, full_name, email, role, hospital_id)
    values (new.id, v_org, coalesce(new.raw_app_meta_data ->> 'full_name', ''), new.email, v_role, v_hospital)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_metadata_updated after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: users invited before this fix.
insert into public.profiles (user_id, org_id, full_name, email, role, hospital_id)
select u.id,
       (u.raw_app_meta_data ->> 'org_id')::uuid,
       coalesce(u.raw_app_meta_data ->> 'full_name', ''),
       u.email,
       coalesce(nullif(u.raw_app_meta_data ->> 'role', ''), 'viewer')::public.user_role,
       nullif(u.raw_app_meta_data ->> 'hospital_id', '')::uuid
from auth.users u
where nullif(u.raw_app_meta_data ->> 'org_id', '') is not null
  and exists (select 1 from public.orgs o where o.id = (u.raw_app_meta_data ->> 'org_id')::uuid)
  and not exists (select 1 from public.profiles p where p.user_id = u.id)
on conflict (user_id) do nothing;
