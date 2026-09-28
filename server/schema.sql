-- ============================================================================
--  SAHAYA DATABASE SCHEMA
--  Paste this entire script into Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--  and click Run. Safe to re-run (everything uses IF NOT EXISTS).
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  preferred_language text default 'en',
  emergency_preferences jsonb default '{}'::jsonb,
  accessibility_preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- SAFETY STATE ----------
create table if not exists public.safety_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  state text not null check (state in ('safe','check_on_me','emergency')),
  note text,
  created_at timestamptz default now()
);
create index if not exists idx_safety_states_user on public.safety_states(user_id, created_at desc);

-- ---------- TRUSTED CONTACTS ----------
create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  notification_preference text default 'email',
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_contacts_user on public.trusted_contacts(user_id);

-- ---------- JOURNEYS ----------
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  origin_label text,
  origin_lat double precision,
  origin_lng double precision,
  destination_label text not null,
  dest_lat double precision,
  dest_lng double precision,
  expected_arrival timestamptz,
  status text default 'active' check (status in ('active','completed','cancelled')),
  trusted_contact_id uuid references public.trusted_contacts(id) on delete set null,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_journeys_user on public.journeys(user_id, created_at desc);

-- ---------- CHECK-INS ----------
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  journey_id uuid references public.journeys(id) on delete cascade,
  status text not null check (status in ('safe','extend','help','no_response')),
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz default now()
);

-- ---------- SAFETY TIMERS ----------
create table if not exists public.safety_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_minutes integer not null,
  status text default 'active' check (status in ('active','completed','extended','escalated','cancelled')),
  started_at timestamptz default now(),
  expires_at timestamptz not null,
  ended_at timestamptz
);
create index if not exists idx_timers_user on public.safety_timers(user_id, status);

-- ---------- EMERGENCY EVENTS ----------
create table if not exists public.emergency_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  state text not null default 'active' check (state in ('active','resolved','cancelled')),
  location_lat double precision,
  location_lng double precision,
  location_label text,
  delivery_status text default 'sending' check (delivery_status in ('sending','sent','confirmed','failed','retry_available')),
  device_info jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
create index if not exists idx_emergency_user on public.emergency_events(user_id, created_at desc);

-- ---------- INCIDENT VAULT ----------
create table if not exists public.incident_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  ai_summary text,
  timeline jsonb default '[]'::jsonb,
  occurred_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_incidents_user on public.incident_records(user_id, created_at desc);

-- ---------- COMMUNITY REPORTS ----------
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete set null,
  category text not null check (category in ('streetlight','road','isolated','transport','other')),
  description text not null,
  location_label text,
  location_lat double precision,
  location_lng double precision,
  status text default 'pending' check (status in ('pending','verified','resolved','rejected')),
  created_at timestamptz default now()
);
create index if not exists idx_reports_status on public.community_reports(status, created_at desc);

-- ---------- NOTIFICATIONS LOG ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb default '{}'::jsonb,
  delivery_status text default 'pending',
  created_at timestamptz default now()
);

-- ---------- AUDIT LOG ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ============ RLS ============
-- Service-role (used by backend) bypasses RLS.
-- We enable RLS so any leaked anon-key access is blocked.

alter table public.profiles              enable row level security;
alter table public.trusted_contacts      enable row level security;
alter table public.journeys              enable row level security;
alter table public.check_ins             enable row level security;
alter table public.safety_timers         enable row level security;
alter table public.emergency_events      enable row level security;
alter table public.incident_records      enable row level security;
alter table public.community_reports    enable row level security;
alter table public.safety_states         enable row level security;
alter table public.notifications         enable row level security;
alter table public.audit_logs            enable row level security;

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_touch  on public.profiles;
drop trigger if exists trg_contacts_touch   on public.trusted_contacts;
drop trigger if exists trg_incidents_touch  on public.incident_records;

create trigger trg_profiles_touch  before update on public.profiles         for each row execute function public.touch_updated_at();
create trigger trg_contacts_touch   before update on public.trusted_contacts  for each row execute function public.touch_updated_at();
create trigger trg_incidents_touch  before update on public.incident_records for each row execute function public.touch_updated_at();

-- Done. ✅
