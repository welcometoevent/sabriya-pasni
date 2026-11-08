-- Seed Sabriya's event after running supabase/event-platform.sql
insert into public.events (slug,title,access_mode,event_date,venue)
values ('sabriyapasni','Sabriya’s Pasni Celebration','invite_only','2026-11-29 18:00:00-05','Royal Palace Ballroom, 1700 Van Bibber Rd, Edgewood, MD')
on conflict (slug) do update set title=excluded.title,access_mode=excluded.access_mode,event_date=excluded.event_date,venue=excluded.venue;
-- Only the existing admin user may read the event ID from the browser.
grant usage on schema public to authenticated;
grant select on public.events to authenticated;
drop policy if exists "Organizer reads events" on public.events;
create policy "Organizer reads events" on public.events for select to authenticated
using ((select auth.uid()) = '7b5df442-b39c-41ae-b637-4907250797e8'::uuid);
