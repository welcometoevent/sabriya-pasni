-- Apply after event-platform.sql. Platform MVP migration.
-- This migration is for a staging project until reviewed and tested.
alter table public.events add column if not exists owner_id uuid references auth.users(id);
alter table public.events add column if not exists description text;
alter table public.events add column if not exists starts_at timestamptz;
alter table public.events add column if not exists ends_at timestamptz;
alter table public.events add column if not exists cover_url text;
create index if not exists events_owner_idx on public.events(owner_id);
create index if not exists invitations_event_idx on public.invitations(event_id);
create index if not exists event_rsvps_event_idx on public.event_rsvps(event_id);
alter table public.events enable row level security;
alter table public.invitations enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.invitation_deliveries enable row level security;
drop policy if exists "Organizer reads events" on public.events;
drop policy if exists "Owners select events" on public.events;
drop policy if exists "Owners create events" on public.events;
drop policy if exists "Owners update events" on public.events;
drop policy if exists "Owners delete events" on public.events;
create policy "Owners select events" on public.events for select to authenticated using (owner_id=(select auth.uid()));
create policy "Owners create events" on public.events for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "Owners update events" on public.events for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "Owners delete events" on public.events for delete to authenticated using (owner_id=(select auth.uid()));
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.events to authenticated;
-- Direct guest-table access remains denied. A validated server-side function handles invitations and RSVPs.
revoke all on public.invitations,public.event_rsvps,public.invitation_deliveries from anon,authenticated;
-- Existing single-admin RSVP table is intentionally untouched.
-- Do not assign ownership of historical events without explicit owner verification.
