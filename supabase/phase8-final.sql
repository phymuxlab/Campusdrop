-- CampusDrop Phase 8 final product features
alter table public.listings add column if not exists listing_type text not null default 'product' check (listing_type in ('product','accommodation'));
alter table public.listings add column if not exists property_type text;
alter table public.listings add column if not exists bedrooms integer;
alter table public.listings add column if not exists bathrooms integer;
alter table public.listings add column if not exists available_spaces integer;
alter table public.listings add column if not exists furnished boolean;
alter table public.listings add column if not exists availability_date date;
alter table public.listings add column if not exists payment_initial numeric;
alter table public.listings add column if not exists payment_balance numeric;
alter table public.listings add column if not exists payment_schedule text;
alter table public.listings add column if not exists extra_fees jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists amenities text[] not null default '{}'::text[];
alter table public.listings add column if not exists rules text;

create index if not exists listings_listing_type_idx on public.listings(listing_type);
create index if not exists listings_status_idx on public.listings(status);

-- A single admin function keeps broadcast writes out of the client-side RLS surface.
create or replace function public.admin_broadcast_notification(p_title text, p_body text, p_type text default 'system', p_listing_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); inserted_count integer;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and role = 'admin') then
    raise exception 'Admin access required';
  end if;
  insert into public.notifications(user_id, type, title, body, listing_id)
  select id, left(coalesce(p_type,'system'),60), left(p_title,180), left(p_body,2000), p_listing_id
  from public.profiles;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.admin_broadcast_notification(text,text,text,uuid) from public;
grant execute on function public.admin_broadcast_notification(text,text,text,uuid) to authenticated;

-- Notify active price-alert subscribers whenever a seller changes a price.
create or replace function public.notify_price_alerts_on_listing_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price is distinct from old.price then
    insert into public.notifications(user_id, type, title, body, listing_id)
    select pa.user_id,
           'price_alert',
           'Price changed',
           format('%s changed from ₦%s to ₦%s.', coalesce(new.title,'A listing'), to_char(old.price, 'FM999,999,999,990.##'), to_char(new.price, 'FM999,999,999,990.##')),
           new.id
    from public.price_alerts pa
    join public.notification_preferences np on np.user_id = pa.user_id
    where pa.listing_id = new.id and np.price_alerts = true and pa.user_id <> new.seller_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_price_alerts on public.listings;
create trigger trg_notify_price_alerts after update of price on public.listings for each row execute function public.notify_price_alerts_on_listing_price_change();

-- Ensure authenticated users can manage their own alert records; notification preferences already govern delivery.
alter table public.price_alerts enable row level security;
drop policy if exists "Users manage own price alerts" on public.price_alerts;
create policy "Users manage own price alerts" on public.price_alerts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Accommodation status uses the existing status field: available -> sold is retained for simple UI compatibility;
-- the frontend presents it as Rented for accommodation listings.
