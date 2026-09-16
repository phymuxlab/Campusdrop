-- CampusDrop Phase 5: avatars + profile/admin security hardening

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_user_insert on storage.objects;
drop policy if exists avatars_user_update on storage.objects;
drop policy if exists avatars_user_delete on storage.objects;

create policy avatars_public_read on storage.objects for select to public using (bucket_id = 'avatars');
create policy avatars_user_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_user_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_user_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, campus, avatar_url)
  values(new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'campus', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;

drop policy if exists profiles_own_insert on public.profiles;
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = ''
as $$
begin
  -- auth.uid() is present for normal client requests and null for trusted
  -- server-side/service-role operations. Only client-controlled writes are
  -- forced to the normal student role / prevented from changing roles.
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
create trigger protect_profile_role before insert or update on public.profiles for each row execute function public.protect_profile_role();
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

drop policy if exists listing_images_user_update on storage.objects;

alter table public.listings drop constraint if exists listings_title_length_check;
alter table public.listings add constraint listings_title_length_check check (char_length(title) between 3 and 120);
alter table public.listings drop constraint if exists listings_description_length_check;
alter table public.listings add constraint listings_description_length_check check (char_length(description) between 10 and 5000);
alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check check (category = any (array['Phones & Gadgets'::text,'Laptops'::text,'Fashion'::text,'Books'::text,'Gaming'::text,'Services'::text]));
alter table public.listings drop constraint if exists listings_campus_length_check;
alter table public.listings add constraint listings_campus_length_check check (char_length(campus) between 2 and 120);
alter table public.messages drop constraint if exists messages_body_length_check;
alter table public.messages add constraint messages_body_length_check check (char_length(body) between 1 and 2000);
