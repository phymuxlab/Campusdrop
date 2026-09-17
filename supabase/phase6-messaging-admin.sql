-- CampusDrop Phase 6: WhatsApp-style messaging, private image attachments,
-- delivery/read status, edit/delete controls, and reliable moderation actions.

-- Message columns already exist on the current production database; these are
-- kept idempotent for fresh/staged databases.
alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;

alter table public.messages drop constraint if exists messages_body_length_check;
alter table public.messages add constraint messages_body_length_check
  check (char_length(coalesce(body, '')) <= 2000 and (char_length(coalesce(body, '')) > 0 or attachment_path is not null));

-- A private bucket keeps chat images from being publicly enumerable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-attachments', 'message-attachments', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored as <sender-uuid>/<conversation-uuid>/<random-file>.
drop policy if exists message_attachments_insert on storage.objects;
drop policy if exists message_attachments_select on storage.objects;
drop policy if exists message_attachments_update on storage.objects;
drop policy if exists message_attachments_delete on storage.objects;

create policy message_attachments_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.conversations c
    where c.id = ((storage.foldername(name))[2])::uuid
      and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
  )
);

create policy message_attachments_select on storage.objects
for select to authenticated
using (
  bucket_id = 'message-attachments'
  and exists (
    select 1 from public.conversations c
    where c.id = ((storage.foldername(name))[2])::uuid
      and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
  )
);

create policy message_attachments_update on storage.objects
for update to authenticated
using (bucket_id = 'message-attachments' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'message-attachments' and owner_id = (select auth.uid())::text);

create policy message_attachments_delete on storage.objects
for delete to authenticated
using (bucket_id = 'message-attachments' and owner_id = (select auth.uid())::text);

-- Realtime must include message INSERT/UPDATE events for chat delivery and ticks.
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
end $$;

-- Sender-only edit. The ten-minute limit is enforced in the database.
create or replace function public.edit_message(p_message_id uuid, p_body text)
returns public.messages
language plpgsql security definer set search_path = public
as $$
declare result public.messages;
begin
  if p_body is null or char_length(btrim(p_body)) = 0 or char_length(p_body) > 2000 then
    raise exception 'Message text must be between 1 and 2000 characters';
  end if;

  update public.messages
     set body = btrim(p_body), edited_at = now()
   where id = p_message_id
     and sender_id = auth.uid()
     and deleted_at is null
     and created_at >= now() - interval '10 minutes'
  returning * into result;

  if result.id is null then raise exception 'Message can no longer be edited'; end if;
  return result;
end;
$$;

-- Sender-only soft delete so the other participant sees a clear deleted-message marker.
create or replace function public.delete_message(p_message_id uuid)
returns public.messages
language plpgsql security definer set search_path = public
as $$
declare result public.messages;
begin
  update public.messages
     set body = '', deleted_at = now(), edited_at = null
   where id = p_message_id
     and sender_id = auth.uid()
     and deleted_at is null
  returning * into result;

  if result.id is null then raise exception 'Message cannot be deleted'; end if;
  return result;
end;
$$;

-- Recipient delivery/seen markers are controlled by the conversation member.
create or replace function public.mark_messages_delivered(p_conversation_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare changed integer;
begin
  update public.messages m
     set delivered_at = coalesce(m.delivered_at, now())
   where m.conversation_id = p_conversation_id
     and m.sender_id <> auth.uid()
     and exists (
       select 1 from public.conversations c
       where c.id = m.conversation_id
         and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
     );
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.mark_messages_seen(p_conversation_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare changed integer;
begin
  update public.messages m
     set delivered_at = coalesce(m.delivered_at, now()), read_at = coalesce(m.read_at, now())
   where m.conversation_id = p_conversation_id
     and m.sender_id <> auth.uid()
     and m.read_at is null
     and exists (
       select 1 from public.conversations c
       where c.id = m.conversation_id
         and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
     );
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.edit_message(uuid,text) from public, anon;
revoke all on function public.delete_message(uuid) from public, anon;
revoke all on function public.mark_messages_delivered(uuid) from public, anon;
revoke all on function public.mark_messages_seen(uuid) from public, anon;
grant execute on function public.edit_message(uuid,text) to authenticated;
grant execute on function public.delete_message(uuid) to authenticated;
grant execute on function public.mark_messages_delivered(uuid) to authenticated;
grant execute on function public.mark_messages_seen(uuid) to authenticated;

-- Moderators can update report status. Removal is performed by the admin UI by
-- also hiding the associated listing, so the reported item leaves the marketplace.
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports
for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists listings_admin_update on public.listings;
create policy listings_admin_update on public.listings
for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Delivery is recorded when the recipient's client actually opens the conversation,
-- not at insert time. This preserves the WhatsApp-style one-tick -> double-tick flow.
drop trigger if exists set_message_delivered on public.messages;
drop function if exists public.mark_message_delivered();
