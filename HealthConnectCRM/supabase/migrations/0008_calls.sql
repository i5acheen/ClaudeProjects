-- Coordinator call tracking (admin insights). Calls are placed from the coordinator's own mobile via the
-- CRM's Call button (tel: link) and logged with an outcome. No telephony provider is involved, so duration
-- is what the coordinator enters; a call-masking provider can fill these rows automatically later.

alter table public.profiles add column if not exists phone_e164 text
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

create type public.call_outcome as enum
  ('connected', 'no_answer', 'busy', 'switched_off', 'wrong_number', 'callback_requested');

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  staff_phone text,                        -- coordinator's mobile at the time of the call
  started_at timestamptz not null default now(),
  outcome public.call_outcome not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 14400),
  notes text check (notes is null or length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calls_user_started on public.calls (user_id, started_at desc);
create index calls_lead on public.calls (lead_id, started_at desc);
create trigger set_updated_at before update on public.calls for each row execute function public.set_updated_at();

alter table public.calls enable row level security;
alter table public.calls force row level security;

-- Staff in the org can read call history (coordinators share leads); only admins see everyone's in /team,
-- which is enforced in the app; the data itself is not more sensitive than the lead it belongs to.
create policy calls_staff_select on public.calls for select to authenticated
  using (org_id = public.auth_org_id() and public.is_staff());
-- A call is always logged as yourself — nobody can log calls on someone else's behalf.
create policy calls_insert_own on public.calls for insert to authenticated
  with check (org_id = public.auth_org_id() and public.is_staff() and user_id = auth.uid());
-- Call records are evidence of work done: no user (admins included) can edit or delete them.
-- Patient deletion clears call notes through anonymise_patient() below.
revoke update, delete, truncate on public.calls from anon, authenticated;

-- Privacy tools now cover calls: export includes them, anonymisation clears their notes.
create or replace function public.export_patient(p_patient_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_out jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select org_id into v_org from public.patients where id = p_patient_id;
  if v_org is distinct from public.auth_org_id() then
    raise exception 'patient not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'patient', to_jsonb(p),
    'consents', coalesce((select jsonb_agg(to_jsonb(c)) from public.consents c where c.patient_id = p.id), '[]'),
    'leads', coalesce((select jsonb_agg(to_jsonb(l)) from public.leads l where l.patient_id = p.id), '[]'),
    'facts', coalesce((select jsonb_agg(to_jsonb(f)) from public.lead_facts f
                       join public.leads l on l.id = f.lead_id where l.patient_id = p.id), '[]'),
    'stage_events', coalesce((select jsonb_agg(to_jsonb(s)) from public.stage_events s
                              join public.leads l on l.id = s.lead_id where l.patient_id = p.id), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
                            'created_at', m.created_at, 'direction', m.direction, 'sender', m.sender,
                            'type', m.type, 'body', m.body, 'template_name', m.template_name) order by m.created_at)
                          from public.messages m join public.conversations cv on cv.id = m.conversation_id
                          where cv.patient_id = p.id and not m.is_internal_note), '[]'),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('started_at', c.started_at, 'outcome', c.outcome,
                         'duration_seconds', c.duration_seconds, 'notes', c.notes) order by c.started_at)
                       from public.calls c join public.leads l on l.id = c.lead_id where l.patient_id = p.id), '[]'),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'mime_type', d.mime_type,
                            'created_at', d.created_at)) from public.documents d where d.patient_id = p.id), '[]')
  ) into v_out
  from public.patients p where p.id = p_patient_id;

  insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id)
  values (v_org, auth.uid(), 'patient.exported', 'patients', p_patient_id::text);
  return v_out;
end $$;

create or replace function public.anonymise_patient(p_patient_id uuid, p_reason text) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_paths text[];
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select org_id into v_org from public.patients where id = p_patient_id;
  if v_org is null or (auth.uid() is not null and v_org is distinct from public.auth_org_id()) then
    raise exception 'patient not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(storage_path), '{}') into v_paths from public.documents where patient_id = p_patient_id;
  delete from public.documents where patient_id = p_patient_id;
  delete from public.lead_facts where lead_id in (select id from public.leads where patient_id = p_patient_id);
  delete from public.notes where lead_id in (select id from public.leads where patient_id = p_patient_id);
  update public.calls set notes = null where lead_id in (select id from public.leads where patient_id = p_patient_id);
  update public.messages set body = null, wa_media_id = null
    where conversation_id in (select id from public.conversations where patient_id = p_patient_id);
  update public.patients set
    full_name = 'Deleted patient',
    phone_e164 = 'anon:' || id::text,
    age = null, gender = null, district = null, taluka = null,
    consent_whatsapp = false,
    opted_out_at = coalesce(opted_out_at, now()),
    deleted_at = now()
  where id = p_patient_id;
  update public.leads set bot_enabled = false where patient_id = p_patient_id;

  insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id, after)
  values (v_org, auth.uid(), 'patient.anonymised', 'patients', p_patient_id::text,
          jsonb_build_object('reason', p_reason, 'documents_removed', coalesce(array_length(v_paths, 1), 0)));
  return v_paths;
end $$;
