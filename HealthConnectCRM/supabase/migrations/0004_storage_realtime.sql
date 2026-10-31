-- Private documents bucket + Realtime (CLAUDE.md §5 documents, §8 realtime, §10)
-- Guarded so the migration also applies to the plain-Postgres RLS test harness.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('documents', 'documents', false, 10485760,
            array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do update set public = false;

    -- Path convention: {org_id}/{patient_id}/{document_id}.{ext}
    -- Staff of the org may read (signed URLs are issued server-side, 60 s expiry).
    -- Uploads come from the media worker (service role) or staff in their org.
    execute $p$
      create policy documents_staff_read on storage.objects for select to authenticated
        using (bucket_id = 'documents'
               and (storage.foldername(name))[1] = public.auth_org_id()::text
               and public.is_staff())
    $p$;
    execute $p$
      create policy documents_staff_insert on storage.objects for insert to authenticated
        with check (bucket_id = 'documents'
                    and (storage.foldername(name))[1] = public.auth_org_id()::text
                    and public.is_staff())
    $p$;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.leads, public.messages, public.conversations, public.notifications;
  end if;
end $$;
