-- Row Level Security (CLAUDE.md §5 "Row Level Security", §10)
-- Roles: admin (everything in org), coordinator (operational data in org),
-- hospital_partner (own hospital's leads at stage >= Referred, read-only), viewer (aggregates only).
-- service_role bypasses RLS and is used only by server code and Inngest jobs.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- orgs ----------------------------------------------------------------------
create policy orgs_select on public.orgs for select to authenticated
  using (id = public.auth_org_id());
create policy orgs_update on public.orgs for update to authenticated
  using (id = public.auth_org_id() and public.is_admin())
  with check (id = public.auth_org_id() and public.is_admin());

-- profiles ------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or (org_id = public.auth_org_id() and public.is_staff()));
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (org_id = public.auth_org_id() and public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (org_id = public.auth_org_id() and public.is_admin())
  with check (org_id = public.auth_org_id() and public.is_admin());

-- hospitals: any active org member may read the list; admin manages ------------
create policy hospitals_select on public.hospitals for select to authenticated
  using (org_id = public.auth_org_id());
create policy hospitals_admin_write on public.hospitals for all to authenticated
  using (org_id = public.auth_org_id() and public.is_admin())
  with check (org_id = public.auth_org_id() and public.is_admin());

-- campaigns: staff + viewer read (no personal data) --------------------------
create policy campaigns_select on public.campaigns for select to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() in ('admin', 'coordinator', 'viewer'));
create policy campaigns_admin_write on public.campaigns for all to authenticated
  using (org_id = public.auth_org_id() and public.is_admin())
  with check (org_id = public.auth_org_id() and public.is_admin());

-- Operational tables: admin + coordinator read/write in their org -------------
do $$
declare t text;
begin
  foreach t in array array['patients', 'leads', 'lead_facts', 'conversations', 'messages',
                           'documents', 'tasks', 'notes', 'consents'] loop
    execute format($f$
      create policy %1$s_staff_select on public.%1$I for select to authenticated
        using (org_id = public.auth_org_id() and public.is_staff());
      create policy %1$s_staff_insert on public.%1$I for insert to authenticated
        with check (org_id = public.auth_org_id() and public.is_staff());
      create policy %1$s_staff_update on public.%1$I for update to authenticated
        using (org_id = public.auth_org_id() and public.is_staff())
        with check (org_id = public.auth_org_id() and public.is_staff());
      create policy %1$s_admin_delete on public.%1$I for delete to authenticated
        using (org_id = public.auth_org_id() and public.is_admin());
    $f$, t);
  end loop;
end $$;

-- Stage changes only through move_lead_stage(): staff cannot write `stage` directly.
-- (A column-level revoke is a no-op while a table-level grant exists, so re-grant per column.)
revoke update on public.leads from authenticated;
grant update (source, campaign_id, treatment, scheme, assigned_to, hospital_id, visit_at,
              bot_enabled, needs_human, needs_human_since, next_action_at, archived_at)
  on public.leads to authenticated;

-- Hospital partner: read-only, own hospital, stage >= Referred (4) -------------
create policy leads_partner_select on public.leads for select to authenticated
  using (
    public.auth_role() = 'hospital_partner'
    and org_id = public.auth_org_id()
    and hospital_id = public.auth_hospital_id()
    and stage >= 4
  );

create policy patients_partner_select on public.patients for select to authenticated
  using (
    public.auth_role() = 'hospital_partner'
    and org_id = public.auth_org_id()
    and deleted_at is null
    and exists (
      select 1 from public.leads l
      where l.patient_id = patients.id
        and l.hospital_id = public.auth_hospital_id()
        and l.stage >= 4
    )
  );

-- Read-only for staff (written by functions / jobs) ---------------------------
create policy stage_events_staff_select on public.stage_events for select to authenticated
  using (org_id = public.auth_org_id() and public.is_staff());
create policy bot_runs_staff_select on public.bot_runs for select to authenticated
  using (org_id = public.auth_org_id() and public.is_staff());

-- Templates + knowledge base: staff read, admin write -------------------------
create policy wa_templates_select on public.wa_templates for select to authenticated
  using (org_id = public.auth_org_id() and public.is_staff());
create policy wa_templates_admin_write on public.wa_templates for all to authenticated
  using (org_id = public.auth_org_id() and public.is_admin())
  with check (org_id = public.auth_org_id() and public.is_admin());
create policy kb_articles_select on public.kb_articles for select to authenticated
  using (org_id = public.auth_org_id() and public.is_staff());
create policy kb_articles_admin_write on public.kb_articles for all to authenticated
  using (org_id = public.auth_org_id() and public.is_admin())
  with check (org_id = public.auth_org_id() and public.is_admin());

-- Notifications: only your own ---------------------------------------------
create policy notifications_own_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log: admin reads own org; writes only through log_audit() --------------
create policy audit_log_admin_select on public.audit_log for select to authenticated
  using (org_id = public.auth_org_id() and public.is_admin());
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- webhook_events: no policies at all -> only service_role can touch it.

-- anon gets nothing on any table
revoke all on all tables in schema public from anon;
