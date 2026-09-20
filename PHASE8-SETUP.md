# CampusDrop Phase 8 setup

## Included
- Light/white CampusDrop theme only; dark/system theme controls removed.
- Google OAuth profile completion: Google name/email are carried into `/auth/complete-profile`, then campus/location and optional private phone/WhatsApp are collected.
- Student verification using **student ID / current enrolment document** only.
- Private verification-document storage and admin review queue.
- Verified Student badge on the owner profile and public profiles after admin approval.
- Block/unblock users.
- Share listing links.
- Recently viewed tracking.
- Price-alert records and notification preferences.
- Skeleton loading states on the main marketplace/profile/messages/admin/product/favourites/settings flows.
- Chat attachment URL hydration for initial and realtime messages.
- Existing message send constraint remains compatible with image-only messages.

## Supabase
The Phase 8 database migration is `supabase/phase8-migration.sql` and has been applied to the CampusDrop Supabase project used by the project. It creates the verification, blocking, recently-viewed, favourite-folder, price-alert and notification-preference structures plus the private `verification-documents` storage bucket.

## Student verification flow
1. Student opens Profile -> Get verified.
2. Selects institution/campus and optionally department/level.
3. Uploads a current student ID or enrolment document (JPG/PNG/WebP/PDF, max 10MB).
4. Submission becomes Pending.
5. Admin opens the private document from Admin -> Student verification.
6. Admin approves or rejects.
7. Approval makes the `Verified Student` badge visible publicly.

The submitted document itself is never exposed through the public profile.

## Custom auth emails
The branded HTML templates remain in `supabase/email-templates/`:
- `campusdrop-confirmation.html`
- `campusdrop-recovery.html`

Hosted Supabase projects do not automatically read these files from GitHub. Apply them in Supabase Dashboard -> Authentication -> Email Templates. If the hosted project's default email provider does not allow template customisation on the current plan, configure a supported custom SMTP provider first, then use the templates.

## Intentionally deferred
Ratings/reviews are not enabled yet because the safe version should be tied to a completed transaction. Orders/payments/delivery and other larger marketplace features are intentionally outside Phase 8 as requested.

Push notifications, device/session management and account deletion also require a dedicated server-side workflow rather than pretending a client-only button is secure; they remain outside this Phase 8 package.
