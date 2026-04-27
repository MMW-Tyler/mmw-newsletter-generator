-- ============================================================
-- MMW Newsletter Generator — V1 schema
-- ============================================================
-- Run this in the Supabase SQL editor against the new project.
-- Service-role key bypasses RLS, so we keep RLS off here (single
-- shared login, server-only access). If you ever expose direct
-- client access to Supabase, add RLS policies before doing so.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type vertical_t as enum ('obgyn', 'medspa', 'functional', 'urogyn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type template_t as enum ('standard', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_t as enum ('master_record', 'brand_voice', 'html_template');
exception when duplicate_object then null; end $$;

do $$ begin
  create type newsletter_status_t as enum (
    'not_started', 'drafted', 'in_review', 'sent_for_approval', 'approved'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists ae_list (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  clinic_name text not null,
  vertical vertical_t not null,
  ae_id uuid references ae_list(id) on delete set null,
  template_type template_t not null default 'standard',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_ae on clients(ae_id);
create index if not exists idx_clients_archived on clients(archived);
create index if not exists idx_clients_vertical on clients(vertical);

create table if not exists client_assets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  asset_type asset_t not null,
  content text not null,
  updated_at timestamptz not null default now(),
  unique (client_id, asset_type)
);

create index if not exists idx_assets_client on client_assets(client_id);

create table if not exists client_rules (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  rule_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rules_client on client_rules(client_id);

create table if not exists newsletters (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2024 and 2100),
  status newsletter_status_t not null default 'drafted',
  full_content text,
  topic_summary text,
  features_input text,
  links_input jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsletters_client_month on newsletters(client_id, year desc, month desc);
create index if not exists idx_newsletters_status on newsletters(status);

create table if not exists calendar_events (
  id uuid primary key default uuid_generate_v4(),
  month int not null check (month between 1 and 12),
  day int check (day between 1 and 31),
  title text not null,
  description text,
  applicable_verticals text[] not null default '{}'
);

create index if not exists idx_calendar_month on calendar_events(month);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_set_updated_at on clients;
create trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at();

drop trigger if exists assets_set_updated_at on client_assets;
create trigger assets_set_updated_at
  before update on client_assets
  for each row execute function set_updated_at();

drop trigger if exists newsletters_set_updated_at on newsletters;
create trigger newsletters_set_updated_at
  before update on newsletters
  for each row execute function set_updated_at();
