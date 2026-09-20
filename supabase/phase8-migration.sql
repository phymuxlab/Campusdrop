-- CampusDrop Phase 8: trust, ratings, discovery and account preferences
create table if not exists public.student_verifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  institution text not null, campus text not null, department text, level text, document_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text, submitted_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references public.profiles(id)
);
alter table public.student_verifications enable row level security;
create policy "verification owner read" on public.student_verifications for select using (auth.uid() = user_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "verification owner insert" on public.student_verifications for insert with check (auth.uid() = user_id);
create policy "verification owner update" on public.student_verifications for update using (auth.uid() = user_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (auth.uid() = user_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade, blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(blocker_id, blocked_id), check(blocker_id <> blocked_id)
);
alter table public.blocked_users enable row level security;
create policy "blocks owner all" on public.blocked_users for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

create table if not exists public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade, listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at timestamptz not null default now(), primary key(user_id, listing_id)
);
alter table public.recently_viewed enable row level security;
create policy "recent owner all" on public.recently_viewed for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.favourite_folders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, name text not null,
  created_at timestamptz not null default now(), unique(user_id,name)
);
alter table public.favourite_folders enable row level security;
create policy "folder owner all" on public.favourite_folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.favourites add column if not exists folder_id uuid references public.favourite_folders(id) on delete set null;

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, listing_id uuid not null references public.listings(id) on delete cascade,
  target_price numeric check(target_price >= 0), created_at timestamptz not null default now(), unique(user_id,listing_id)
);
alter table public.price_alerts enable row level security;
create policy "price alerts owner all" on public.price_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade, messages boolean not null default true, favourites boolean not null default true,
  price_alerts boolean not null default true, system boolean not null default true, updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "notification prefs owner all" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('verification-documents','verification-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];
create policy "verification docs owner upload" on storage.objects for insert to authenticated with check (bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "verification docs owner read" on storage.objects for select to authenticated using (bucket_id='verification-documents' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')));
create policy "verification docs owner delete" on storage.objects for delete to authenticated using (bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create index if not exists recently_viewed_user_idx on public.recently_viewed(user_id, viewed_at desc);
create index if not exists student_verifications_status_idx on public.student_verifications(status);
