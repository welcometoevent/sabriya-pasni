# Welcome to Event — rollout plan

This branch is a **non-production staging foundation**. The live Pasni RSVP and admin pages are unchanged.

## URLs
- `/`: public Welcome to Event brand homepage.
- `/sabriyapasni/`: invite-only event entry. Do not expose event details before server-side token validation.
- `/admin/`: existing Supabase-authenticated organizer dashboard.

## Access modes
- `invite_only`: personalized, high-entropy per-household token verified by a server-side Supabase Edge Function; never store raw tokens in the database, only hashes. No guest account required.
- `shared_link`: shared RSVP URL; anti-abuse and duplicate-handling still needed.
- `public`: future discoverable events.

## Next implementation stages
1. Review and run `supabase/event-platform.sql` in Supabase SQL Editor; retain legacy `rsvps` table until migration is tested.
2. Build token creation, verification, RSVP submit/update, and admin guest-management Edge Functions. Require Supabase Auth + allowlisted admin UID for admin functions.
3. Build homepage and event page; gate private event details using verified token response. Keep live website unchanged until tested.
4. Integrate email and SMS through server-side providers, including consent, opt-out, delivery statuses, costs and rate limits.
5. Migrate legacy test responses only after verifying new flow.
6. Fix GitHub Pages DNS/TLS and enforce HTTPS before sharing real invitations.

**Security:** A hidden URL or noindex tag is not access control. Do not send invitations until invite-only validation and HTTPS work.
