-- CampusDrop: live UI updates for notifications, unread counts, profiles,
-- verification badges, conversations and listing changes.

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.student_verifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.listings;
  exception when duplicate_object then null;
  end;
end $$;

drop policy if exists "Approved verifications are publicly visible" on public.student_verifications;
create policy "Approved verifications are publicly visible"
on public.student_verifications
for select
to authenticated
using (status = 'approved');
