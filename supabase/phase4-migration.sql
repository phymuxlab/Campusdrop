-- CampusDrop Phase 4 backend alignment
-- Run this against the CampusDrop Supabase project if applying Phase 4 to a fresh/older database.

alter table public.listing_images add column if not exists url text;

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status = any (array['available'::text,'sold'::text,'hidden'::text]));
alter table public.listings alter column status set default 'available';

-- Listings: public users can browse available listings; only authenticated sellers
-- can create/change/delete their own listings.
drop policy if exists listings_public_read_available on public.listings;
drop policy if exists listings_own_insert on public.listings;
drop policy if exists listings_own_update on public.listings;
drop policy if exists listings_own_delete on public.listings;

create policy listings_public_read_available
on public.listings for select to anon, authenticated
using (status = 'available' or (select auth.uid()) = seller_id);

create policy listings_own_insert
on public.listings for insert to authenticated
with check ((select auth.uid()) = seller_id);

create policy listings_own_update
on public.listings for update to authenticated
using ((select auth.uid()) = seller_id)
with check ((select auth.uid()) = seller_id);

create policy listings_own_delete
on public.listings for delete to authenticated
using ((select auth.uid()) = seller_id);

-- Listing image records are writable only by the authenticated owner of the listing.
drop policy if exists listing_images_own_insert on public.listing_images;
drop policy if exists listing_images_own_delete on public.listing_images;

create policy listing_images_own_insert
on public.listing_images for insert to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = (select auth.uid())
  )
);

create policy listing_images_own_delete
on public.listing_images for delete to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = (select auth.uid())
  )
);
