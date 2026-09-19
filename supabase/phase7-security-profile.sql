-- CampusDrop Phase 7: public profile + private contact data.
create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  whatsapp text,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists location text;

alter table public.profile_private enable row level security;

drop policy if exists "private_profile_select_own" on public.profile_private;
drop policy if exists "private_profile_insert_own" on public.profile_private;
drop policy if exists "private_profile_update_own" on public.profile_private;

create policy "private_profile_select_own"
  on public.profile_private for select to authenticated
  using (auth.uid() = user_id);

create policy "private_profile_insert_own"
  on public.profile_private for insert to authenticated
  with check (auth.uid() = user_id);

create policy "private_profile_update_own"
  on public.profile_private for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists profile_private_user_id_idx on public.profile_private(user_id);
