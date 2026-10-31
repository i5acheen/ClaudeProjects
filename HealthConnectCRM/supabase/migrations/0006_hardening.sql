-- Security review fixes (docs/SECURITY_REVIEW.md F1, F2).

-- F1: the conversation record is evidence. Users may only add internal notes as themselves;
-- every patient-visible message is written by server code (service role) through lib/whatsapp/send.ts.
drop policy if exists messages_staff_insert on public.messages;
drop policy if exists messages_staff_update on public.messages;
create policy messages_staff_insert_notes on public.messages for insert to authenticated
  with check (
    org_id = public.auth_org_id() and public.is_staff()
    and is_internal_note and direction = 'out' and sender = 'coordinator' and sender_user_id = auth.uid()
  );
revoke update on public.messages from authenticated;

-- F2: who verified a document is always the caller.
create or replace function public.stamp_document_verifier() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and (new.verified_at is distinct from old.verified_at or new.verified_by is distinct from old.verified_by) then
    new.verified_by := case when new.verified_at is null then null else auth.uid() end;
  end if;
  return new;
end $$;
create trigger documents_stamp_verifier before update on public.documents
  for each row execute function public.stamp_document_verifier();

-- Consent changes made by users are audited (who changed consent and when).
create or replace function public.audit_consent_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and (new.consent_whatsapp is distinct from old.consent_whatsapp or new.opted_out_at is distinct from old.opted_out_at) then
    insert into public.audit_log (org_id, actor_user_id, action, entity, entity_id, before, after)
    values (new.org_id, auth.uid(), 'patient.consent_changed', 'patients', new.id::text,
            jsonb_build_object('consent_whatsapp', old.consent_whatsapp, 'opted_out_at', old.opted_out_at),
            jsonb_build_object('consent_whatsapp', new.consent_whatsapp, 'opted_out_at', new.opted_out_at));
  end if;
  return new;
end $$;
create trigger patients_audit_consent after update on public.patients
  for each row execute function public.audit_consent_change();
