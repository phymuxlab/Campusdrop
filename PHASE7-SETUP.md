# CampusDrop Phase 7

This is the consolidated Phase 7 project. It is based on the Phase 6 WhatsApp-style messaging/admin build and includes the Phase 7 authentication, profile privacy, theme and UX work.

## Included
- Fixed chat shell: header and composer stay in place; only the message area scrolls.
- Message Info opens in a modal and is available only for messages sent by the current user.
- Close icon and backdrop dismissal for Message Info.
- Forgot-password and reset-password flows.
- Password-strength checklist on registration and reset pages.
- Google OAuth buttons and PKCE callback route.
- Submission cooldowns on login and registration, in addition to Supabase Auth rate limits.
- Branded verification and recovery email templates.
- Light / Dark / System appearance controls, including the account dropdown and Settings.
- Public user profiles with avatar, campus, location and active listings.
- Phone and WhatsApp stored in `profile_private` with owner-only RLS; they are never selected by public-profile queries.
- Custom 404 page.
- Sticky document footer behaviour that does not cover page content.
- Seller links to public profiles from product pages.

## Supabase
The `profile_private` migration has already been applied to the CampusDrop Supabase project used for this build. The SQL is included in `supabase/phase7-security-profile.sql` for reference/reproducibility.

## Google Sign-In setup
In Supabase: Authentication → Providers → Google → enable Google and configure the Google OAuth web client. Add the production site URL as an authorised origin and the Supabase Auth callback URL shown by Supabase as an authorised redirect URI. Keep the application callback at `/auth/callback`.

## Custom verification/recovery emails
The branded templates are in `supabase/email-templates/`. Paste them into Supabase Authentication → Email Templates for Confirm signup and Reset Password. Custom branded mail delivery may require SMTP configuration on the Supabase project.

## Security notes
- Supabase Auth remains the authoritative server-side rate limiter; the UI cooldown prevents accidental rapid repeated requests.
- Protected application routes are checked in middleware with `auth.getUser()`.
- Admin access is checked against the profile role in middleware.
- Sensitive phone/WhatsApp data is isolated in an RLS-protected table.
- Do not expose a service-role key in `.env.local` or client-side code.

## Environment
Create `.env.local` with:

`NEXT_PUBLIC_SUPABASE_URL=...`

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`

Then run `npm install`, `npm run build`, and `npm run dev`.
