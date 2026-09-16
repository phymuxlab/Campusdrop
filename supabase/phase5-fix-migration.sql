-- CampusDrop Phase 5 fix: prevent client-side role escalation without blocking trusted admin updates.
-- Run after phase5-migration.sql on the existing CampusDrop Supabase project.

create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = ''
as $$
begin
  -- auth.uid() is present for normal client requests and null for trusted
  -- server-side/service-role operations.
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.role := 'student';
    elsif new.role is distinct from old.role then
      raise exception 'Profile role cannot be changed from the client';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

revoke execute on function public.protect_profile_role() from public, anon, authenticated;
