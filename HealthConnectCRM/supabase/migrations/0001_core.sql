-- HealthConnectCRM core schema (CLAUDE.md §5)
-- Stages: 0 New, 1 Contacted, 2 Docs pending, 3 Eligible, 4 Referred, 5 Admitted, -1 Lost

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'coordinator', 'hospital_partner', 'viewer');
create type public.lang as enum ('mr', 'hi', 'en');
create type public.lead_source as enum ('meta_lead_ad', 'whatsapp', 'website', 'referral', 'manual');
create type public.scheme as enum ('MJPJAY', 'PM-JAY', 'unknown');
create type public.fact_source as enum ('bot', 'coordinator', 'form');
create type public.msg_direction as enum ('in', 'out');
create type public.msg_sender as enum ('patient', 'bot', 'coordinator', 'system');
create type public.msg_type as enum ('text', 'template', 'image', 'document', 'audio', 'interactive');
create type public.msg_status as enum ('queued', 'sent', 'delivered', 'read', 'failed', 'received');
create type public.doc_kind as enum ('aadhaar', 'ration_card', 'scheme_card', 'prescription', 'report', 'other');
create type public.actor_type as enum ('system', 'bot', 'user');
create type public.task_type as enum ('call', 'chase_docs', 'book_visit', 'confirm_admission');
create type public.template_category as enum ('utility', 'marketing', 'authentication');
create type public.webhook_provider as enum ('meta', 'whatsapp');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  settings jsonb not null default '{"bot": {"enabled": true}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  address text,
  district text,
  empanelled_schemes text[] not null default '{}',
  specialties text[] not null default '{}',
  contact_name text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.user_role not null default 'viewer',
  hospital_id uuid references public.hospitals(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_needs_hospital check (role <> 'hospital_partner' or hospital_id is not null)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  name text not null default '',
  treatment text,
  language public.lang,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, meta_ad_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  full_name text not null default '',
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$' or phone_e164 like 'anon:%'),
  age smallint check (age between 0 and 120),
  gender text,
  district text,
  taluka text,
  preferred_language public.lang not null default 'mr',
  consent_whatsapp boolean not null default false,
  consent_at timestamptz,
  consent_source text,
  opted_out_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, phone_e164)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  source public.lead_source not null default 'manual',
  campaign_id uuid references public.campaigns(id) on delete set null,
  meta_leadgen_id text unique,
  meta_form_id text,
  treatment text,
  scheme public.scheme not null default 'unknown',
  stage smallint not null default 0 check (stage between -1 and 5),
  lost_reason text,
  assigned_to uuid references auth.users(id) on delete set null,
  hospital_id uuid references public.hospitals(id) on delete set null,
  visit_at timestamptz,
  bot_enabled boolean not null default true,
  needs_human boolean not null default false,
  needs_human_since timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  next_action_at timestamptz,
  admitted_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lost_needs_reason check (stage <> -1 or lost_reason is not null)
);

create table public.lead_facts (
  lead_id uuid not null references public.leads(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  key text not null,
  value text not null,
  source public.fact_source not null,
  confidence real check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lead_id, key)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  wa_phone_number_id text not null,
  window_expires_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, wa_phone_number_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  kind public.doc_kind not null default 'other',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes integer,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  direction public.msg_direction not null,
  sender public.msg_sender not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  type public.msg_type not null,
  body text,
  template_name text,
  media_id uuid references public.documents(id) on delete set null,
  wa_media_id text,
  wa_message_id text unique,
  status public.msg_status not null default 'queued',
  error_code text,
  is_internal_note boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage smallint,
  to_stage smallint not null,
  actor_type public.actor_type not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  type public.task_type not null,
  due_at timestamptz not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wa_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  language public.lang not null,
  category public.template_category not null,
  status text not null default 'PENDING',
  body_preview text,
  variables text[] not null default '{}',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name, language)
);

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text not null,
  body text not null,
  language public.lang not null default 'mr',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bot_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  input_message_id uuid references public.messages(id) on delete set null,
  model text,
  prompt_version text,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  output jsonb,
  guardrail_flags text[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.webhook_provider not null,
  event_key text not null unique,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete set null,
  actor_user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  purpose text not null,
  granted boolean not null,
  text_shown text not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  kind text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (§5)
-- ---------------------------------------------------------------------------
create index leads_org_stage_updated on public.leads (org_id, stage, updated_at desc);
create index leads_assigned_to on public.leads (assigned_to);
create index leads_hospital on public.leads (hospital_id) where hospital_id is not null;
create index leads_patient on public.leads (patient_id);
create index messages_conversation_created on public.messages (conversation_id, created_at);
create index messages_lead on public.messages (lead_id);
create index patients_org_phone on public.patients (org_id, phone_e164);
create index webhook_events_unprocessed on public.webhook_events (received_at) where processed_at is null;
create index stage_events_lead on public.stage_events (lead_id, created_at);
create index tasks_assignee_due on public.tasks (assigned_to, due_at) where done_at is null;
create index documents_patient on public.documents (patient_id);
create index audit_log_entity on public.audit_log (entity, entity_id);
create index notifications_user on public.notifications (user_id, created_at desc) where read_at is null;

-- updated_at triggers on every table that has the column
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_at'
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- audit_log is append-only, even for the table owner / service role
-- ---------------------------------------------------------------------------
create or replace function public.audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- ---------------------------------------------------------------------------
-- Caller helpers (security definer so policies don't recurse on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.auth_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where user_id = auth.uid() and is_active
$$;

create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid() and is_active
$$;

create or replace function public.auth_hospital_id() returns uuid
language sql stable security definer set search_path = public as $$
  select hospital_id from public.profiles where user_id = auth.uid() and is_active
$$;

create or replace function public.is_staff() returns boolean
language sql stable as $$
  select coalesce(public.auth_role() in ('admin', 'coordinator'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;
