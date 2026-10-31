-- Functions, triggers and reporting views (CLAUDE.md §5, §8.10, §10)

-- ---------------------------------------------------------------------------
-- Audit writer: actor and org always come from the session, never the caller.
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text, p_entity text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null,
  p_ip text default null, p_user_agent text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.auth_org_id() is null then
    raise exception 'inactive or unknown user' using errcode = '42501';
  end if;
  insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id, before, after, ip, user_agent)
  values (public.auth_org_id(), auth.uid(), p_action, p_entity, p_entity_id, p_before, p_after, p_ip, p_user_agent);
end $$;

-- ---------------------------------------------------------------------------
-- move_lead_stage: the only way a stage changes.
--   user (admin/coordinator): any stage, Lost (-1) requires a reason
--   user (hospital_partner):  4 -> 5 for their own hospital only
--   bot / system (service role only): forward only, capped at Eligible (3)
-- ---------------------------------------------------------------------------
create or replace function public.move_lead_stage(
  p_lead_id uuid,
  p_to_stage smallint,
  p_reason text default null,
  p_admitted_at timestamptz default null,
  p_actor public.actor_type default 'user'
) returns public.leads
language plpgsql security definer set search_path = public as $$
declare
  v_lead public.leads;
  v_from smallint;
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_actor public.actor_type;
begin
  if p_to_stage is null or p_to_stage < -1 or p_to_stage > 5 then
    raise exception 'invalid stage %', p_to_stage using errcode = '22023';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  v_from := v_lead.stage;

  if v_uid is null then
    -- Only server code holding the service role reaches here (execute is revoked from anon).
    if p_actor not in ('bot', 'system') then
      raise exception 'actor must be bot or system without a user session' using errcode = '42501';
    end if;
    v_actor := p_actor;
    if v_from < 0 or p_to_stage <= v_from or p_to_stage > 3 then
      raise exception '% may only move forward up to Eligible (from % to %)', v_actor, v_from, p_to_stage
        using errcode = '42501';
    end if;
  else
    v_actor := 'user';
    v_role := public.auth_role();
    if v_role is null or v_lead.org_id is distinct from public.auth_org_id() then
      raise exception 'lead not found' using errcode = 'P0002';
    end if;
    if v_role = 'hospital_partner' then
      if v_lead.hospital_id is distinct from public.auth_hospital_id() or v_from <> 4 or p_to_stage <> 5 then
        raise exception 'hospital partners may only mark their referred patients as admitted' using errcode = '42501';
      end if;
    elsif v_role not in ('admin', 'coordinator') then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;

  if p_to_stage = v_from then
    return v_lead;
  end if;
  if p_to_stage = -1 and coalesce(btrim(p_reason), '') = '' then
    raise exception 'a reason is required to mark a lead Lost' using errcode = '22023';
  end if;
  if p_to_stage = 4 and v_lead.hospital_id is null then
    raise exception 'assign a hospital before marking Referred' using errcode = '22023';
  end if;

  update public.leads set
    stage = p_to_stage,
    lost_reason = case when p_to_stage = -1 then p_reason else null end,
    admitted_at = case when p_to_stage = 5 then coalesce(p_admitted_at, now()) else admitted_at end,
    closed_at = case when p_to_stage in (-1, 5) then now() else null end
  where id = p_lead_id
  returning * into v_lead;

  insert into public.stage_events (org_id, lead_id, from_stage, to_stage, actor_type, actor_user_id, reason)
  values (v_lead.org_id, v_lead.id, v_from, p_to_stage, v_actor, v_uid, p_reason);

  insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id, before, after)
  values (v_lead.org_id, v_uid, 'lead.stage_changed', 'leads', v_lead.id::text,
          jsonb_build_object('stage', v_from),
          jsonb_build_object('stage', p_to_stage, 'reason', p_reason, 'actor_type', v_actor));

  return v_lead;
end $$;

-- ---------------------------------------------------------------------------
-- Role / activation changes are always audited (§10)
-- ---------------------------------------------------------------------------
create or replace function public.audit_profile_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id, after)
    values (new.org_id, auth.uid(), 'profile.created', 'profiles', new.user_id::text,
            jsonb_build_object('role', new.role, 'hospital_id', new.hospital_id, 'is_active', new.is_active));
  elsif new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.hospital_id is distinct from old.hospital_id then
    insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id, before, after)
    values (new.org_id, auth.uid(), 'profile.role_changed', 'profiles', new.user_id::text,
            jsonb_build_object('role', old.role, 'hospital_id', old.hospital_id, 'is_active', old.is_active),
            jsonb_build_object('role', new.role, 'hospital_id', new.hospital_id, 'is_active', new.is_active));
  end if;
  return new;
end $$;

create trigger profiles_audit after insert or update on public.profiles
  for each row execute function public.audit_profile_change();

-- An admin cannot demote or deactivate themselves (prevents locking the org out).
create or replace function public.prevent_self_demotion() returns trigger
language plpgsql as $$
begin
  if auth.uid() = old.user_id and (new.role <> old.role or not new.is_active) then
    raise exception 'you cannot change your own role or deactivate yourself' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_no_self_demotion before update on public.profiles
  for each row execute function public.prevent_self_demotion();

-- ---------------------------------------------------------------------------
-- New auth user -> profile. Uses app_metadata (only settable by the service
-- role when an admin invites someone), never user-editable user_metadata.
-- Self sign-ups without an invite get no profile and therefore no access.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := nullif(new.raw_app_meta_data ->> 'org_id', '')::uuid;
  v_role public.user_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'viewer')::public.user_role;
  v_hospital uuid := nullif(new.raw_app_meta_data ->> 'hospital_id', '')::uuid;
begin
  if v_org is not null then
    insert into public.profiles (user_id, org_id, full_name, email, role, hospital_id)
    values (new.id, v_org, coalesce(new.raw_app_meta_data ->> 'full_name', ''), new.email, v_role, v_hospital)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Reporting. Views run with the owner's rights (RLS bypassed) so viewers can
-- see aggregates without row access; each view filters to the caller's org
-- and allowed roles itself and exposes no personal data.
-- ---------------------------------------------------------------------------
create or replace view public.v_lead_progress with (security_barrier) as
select
  l.id as lead_id,
  l.org_id,
  l.source,
  l.campaign_id,
  l.treatment,
  l.stage,
  l.assigned_to,
  l.created_at,
  l.admitted_at,
  greatest(
    case when l.stage >= 0 then l.stage else 0 end,
    coalesce((select max(se.to_stage) from public.stage_events se where se.lead_id = l.id and se.to_stage >= 0), 0)
  )::smallint as reached_stage
from public.leads l
where l.org_id = public.auth_org_id()
  and public.auth_role() in ('admin', 'coordinator', 'viewer');

create or replace view public.v_funnel with (security_barrier) as
select
  (date_trunc('day', p.created_at at time zone 'Asia/Kolkata'))::date as day,
  p.source,
  p.campaign_id,
  p.treatment,
  count(*)::int as leads,
  count(*) filter (where p.reached_stage >= 1)::int as contacted,
  count(*) filter (where p.reached_stage >= 2)::int as docs_pending,
  count(*) filter (where p.reached_stage >= 3)::int as eligible,
  count(*) filter (where p.reached_stage >= 4)::int as referred,
  count(*) filter (where p.reached_stage >= 5)::int as admitted,
  count(*) filter (where p.stage = -1)::int as lost
from public.v_lead_progress p
group by 1, 2, 3, 4;

create or replace view public.v_campaign_performance with (security_barrier) as
select
  c.id as campaign_id,
  c.name,
  c.meta_campaign_id,
  c.meta_adset_id,
  c.meta_ad_id,
  c.treatment,
  count(p.lead_id)::int as leads,
  count(p.lead_id) filter (where p.reached_stage >= 1)::int as contacted,
  count(p.lead_id) filter (where p.reached_stage >= 3)::int as eligible,
  count(p.lead_id) filter (where p.reached_stage >= 5)::int as admitted,
  case when count(p.lead_id) = 0 then 0
       else round(100.0 * count(p.lead_id) filter (where p.reached_stage >= 5) / count(p.lead_id), 1)
  end as admission_rate_pct
from public.campaigns c
left join public.v_lead_progress p on p.campaign_id = c.id
where c.org_id = public.auth_org_id()
  and public.auth_role() in ('admin', 'coordinator', 'viewer')
group by c.id;

-- ---------------------------------------------------------------------------
-- Privacy tools (§8.10): admin-only, audited.
-- ---------------------------------------------------------------------------
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
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'mime_type', d.mime_type,
                            'created_at', d.created_at)) from public.documents d where d.patient_id = p.id), '[]')
  ) into v_out
  from public.patients p where p.id = p_patient_id;

  insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id)
  values (v_org, auth.uid(), 'patient.exported', 'patients', p_patient_id::text);
  return v_out;
end $$;

-- Anonymise a patient: removes personal data, keeps aggregate counts intact.
-- Returns the storage paths of the patient's documents so the caller can delete the files.
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

-- ---------------------------------------------------------------------------
-- Execute grants: nothing for anon.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.auth_org_id(), public.auth_role(), public.auth_hospital_id(),
  public.is_staff(), public.is_admin(), public.log_audit(text, text, text, jsonb, jsonb, text, text),
  public.move_lead_stage(uuid, smallint, text, timestamptz, public.actor_type),
  public.export_patient(uuid), public.anonymise_patient(uuid, text)
  to authenticated, service_role;
revoke all on public.v_lead_progress, public.v_funnel, public.v_campaign_performance from anon;
grant select on public.v_funnel, public.v_campaign_performance to authenticated, service_role;
revoke all on public.v_lead_progress from authenticated;
