# CampusDrop — Phase 5

A mobile-first student marketplace by **MUXLAB**.

## What changed
- Integrated the user's supplied CampusDrop logo and recoloured its blue/green artwork to the CampusDrop navy/green palette.
- Mobile navigation is now **Home / Marketplace / Sell / Messages / Notifications**.
- Profile is no longer in the bottom navigation; the signed-in user's avatar opens the account menu in the header.
- Added `/settings` for campus, name and avatar management.
- Added four lightweight default avatars.
- Added avatar upload with browser-side resizing to 512px and JPEG compression before storage.
- Added campus + default avatar selection during registration.
- Added security response headers and removed the Next.js powered-by header.
- Updated Supabase SSR/client packages and Lucide icons within compatible major lines.
- Added privacy, terms, refunds and cookies pages as launch templates.
- Added Supabase avatar storage policies and revoked public RPC execution for internal SECURITY DEFINER helpers.

## Existing Phase 4 fixes retained
- Listing publishing uses the database-supported `available` status.
- Listing image records use the existing `listing_images.url` + `storage_path` fields.
- Publish timeouts prevent an endless `Publishing...` state.
- `/marketplace` remains public while seller/account areas are protected by Supabase SSR middleware.
- MUXLAB branding remains in the footer.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`.
4. Apply `supabase/phase5-migration.sql` to the CampusDrop Supabase project if the avatar bucket/policies have not already been created.
5. Run `npm run dev`.

## Security notes
- Only the Supabase publishable key belongs in browser code. Never expose a secret/service-role key.
- `.gitignore` blocks local environment files, build output and dependency folders from accidental commits.
- This project has no custom API route requiring permissive CORS; browser access goes through Supabase with RLS.
- RLS remains enabled on the public application tables.
- The app sends `Cache-Control: private, no-store` on protected middleware responses.
- Supabase Auth's leaked-password protection should be enabled in the Supabase dashboard before production launch.
- Final business identity, privacy contact, retention schedule, refund terms and local-law review still need the operator's real details before public launch.

**CampusDrop — A MUXLAB project.**

## Code audit — 16 September 2026
- Fixed the Vercel TypeScript failure in `/sell` by giving the timed Supabase insert response an explicit type and selecting only the listing id needed after creation.
- Fixed relationship reads that were treating Supabase nested `listings`/`profiles` results as objects when this project is receiving them as arrays.
- Hardened the profile-role trigger so normal authenticated users cannot self-promote to `admin`, while trusted server-side/admin operations are not blocked by the trigger.
- Added `supabase/phase5-fix-migration.sql` for existing databases that already ran the original Phase 5 migration.

### Verification note
A full `next build` could not be executed in this audit environment because `npm install` repeatedly timed out before dependencies could be installed. The source was statically inspected and the previously reported Vercel TypeScript failure was addressed. The authoritative final check should be the next Vercel build after pushing this package.
