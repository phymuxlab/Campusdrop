# CampusDrop push notifications

The project now includes browser push subscription management, a service worker, push subscription storage, and a Supabase Edge Function for sending push notifications.

## 1. Web app environment
Add this to the production environment variables:

`NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your VAPID public key>`

Keep the VAPID private key out of the Next.js app.

## 2. Supabase Edge Function secrets
For the `push-notify` Edge Function, configure:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example `mailto:admin@your-domain.com`)

The function already receives the normal Supabase `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` runtime secrets.

## 3. Database
Apply `supabase/push-notifications.sql` to the CampusDrop Supabase project.

## 4. Deploy the Edge Function
Deploy `supabase/functions/push-notify/index.ts` as the `push-notify` function with JWT verification enabled.

## 5. iPhone
For iPhone web push, open CampusDrop in Safari, use **Share → Add to Home Screen**, launch CampusDrop from the Home Screen, then enable notifications in CampusDrop Settings.

## 6. Background notification delivery
The app can request subscriptions and the Edge Function can send pushes. To make database-created notifications (including admin broadcasts and price-alert notifications) trigger pushes while the app is closed, connect the `notifications` INSERT event to the `push-notify` function using a Supabase Database Webhook/Edge Function integration. The webhook should pass the recipient `user_id`, notification title/body, and a CampusDrop URL.
