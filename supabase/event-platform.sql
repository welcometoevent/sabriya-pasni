-- Welcome to Event: multi-event foundation (STAGING MIGRATION)
-- Run in Supabase SQL Editor only after reviewing. Does not modify existing public.rsvps.
create extension if not exists pgcrypto;
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
 title text not null,
 access_mode text not null default 'invite_only' check(access_mode in ('invite_only','shared_link','public')),
 event_date timestamptz,
 venue text,
 created_at timestamptz not null default now()
);
create table if not exists public.invitations (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 household_name text not null,
 email text,
 phone text,
 token_hash text not null unique,
 max_guests integer check(max_guests between 1 and 30),
 sent_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.event_rsvps (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 invitation_id uuid unique references public.invitations(id) on delete cascade,
 guest_name text not null,
 attending boolean not null,
 guest_count integer not null check(guest_count between 0 and 30),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((attending and guest_count >= 1) or (not attending and guest_count = 0))
);
create table if not exists public.invitation_deliveries (
 id uuid primary key default gen_random_uuid(),
 invitation_id uuid not null references public.invitations(id) on delete cascade,
 channel text not null check(channel in ('email','sms')),
 status text not null default 'queued' check(status in ('queued','sent','delivered','failed')),
 provider_message_id text,
 created_at timestamptz not null default now()
);
alter table public.events enable row level security;
alter table public.invitations enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.invitation_deliveries enable row level security;
revoke all on public.events,public.invitations,public.event_rsvps,public.invitation_deliveries from anon,authenticated;
-- No public read/write policies: guest access must use backend Edge Functions
-- that validate invitation tokens, rate-limit requests, and return minimal event data.
-- Do not put service-role keys in GitHub Pages or frontend JavaScript.
