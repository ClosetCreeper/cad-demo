-- ═══════════════════════════════════════════════════════════
-- NEXUS CAD — Supabase Schema
-- Paste this entire block into: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- Units (online users)
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  team text not null check (team in ('police','fire','ems','dispatch','civilian')),
  callsign text,
  status text not null default 'available' check (status in ('available','unavailable','busy','enroute','on_scene','off_duty')),
  bodycam_on boolean default false,
  bodycam_url text,
  current_call_id uuid,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

alter table units enable row level security;
create policy "public read/write units" on units for all using (true) with check (true);

-- Calls
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  call_number serial,
  title text not null,
  description text,
  location text,
  priority text not null default 'low' check (priority in ('low','medium','high','emergency')),
  status text not null default 'pending' check (status in ('pending','active','closed')),
  created_by text,
  assigned_units text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table calls enable row level security;
create policy "public read/write calls" on calls for all using (true) with check (true);

-- Civilian profiles
create table if not exists civilians (
  id uuid primary key default gen_random_uuid(),
  owner_username text not null,
  first_name text not null,
  last_name text not null,
  dob text,
  image_url text,
  license_plate text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  license_status text default 'valid' check (license_status in ('valid','invalid','suspended')),
  flags text[] default '{}',
  arrest_log jsonb default '[]',
  citation_log jsonb default '[]',
  created_at timestamptz default now()
);

alter table civilians enable row level security;
create policy "public read/write civilians" on civilians for all using (true) with check (true);

-- Radio messages
create table if not exists radio_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  username text not null,
  team text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table radio_messages enable row level security;
create policy "public read/write radio" on radio_messages for all using (true) with check (true);

-- Keep radio tidy — auto-delete messages older than 24h
create or replace function delete_old_radio() returns trigger language plpgsql as $$
begin
  delete from radio_messages where created_at < now() - interval '24 hours';
  return new;
end;
$$;

create or replace trigger trg_delete_old_radio
after insert on radio_messages
execute procedure delete_old_radio();

-- Enable Realtime on all tables
alter publication supabase_realtime add table units;
alter publication supabase_realtime add table calls;
alter publication supabase_realtime add table civilians;
alter publication supabase_realtime add table radio_messages;
