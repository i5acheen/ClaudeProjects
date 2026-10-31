import type { Client } from "pg";

export const ids = {
  orgA: "00000000-0000-4000-8000-00000000000a",
  orgB: "00000000-0000-4000-8000-00000000000b",
  hospA1: "00000000-0000-4000-8000-0000000000a1",
  hospA2: "00000000-0000-4000-8000-0000000000a2",
  hospB1: "00000000-0000-4000-8000-0000000000b1",
  adminA: "10000000-0000-4000-8000-00000000000a",
  coordA: "20000000-0000-4000-8000-00000000000a",
  partnerA1: "30000000-0000-4000-8000-0000000000a1",
  partnerA2: "30000000-0000-4000-8000-0000000000a2",
  viewerA: "40000000-0000-4000-8000-00000000000a",
  inactiveA: "50000000-0000-4000-8000-00000000000a",
  coordB: "20000000-0000-4000-8000-00000000000b",
  patReferredA1: "60000000-0000-4000-8000-0000000000a1",
  patReferredA2: "60000000-0000-4000-8000-0000000000a2",
  patNewA1: "60000000-0000-4000-8000-0000000000a3",
  patB: "60000000-0000-4000-8000-0000000000b1",
  leadReferredA1: "70000000-0000-4000-8000-0000000000a1",
  leadReferredA2: "70000000-0000-4000-8000-0000000000a2",
  leadNewA1: "70000000-0000-4000-8000-0000000000a3",
  leadB: "70000000-0000-4000-8000-0000000000b1",
} as const;

/** Seeds two orgs. Runs as the superuser (RLS bypassed). */
export async function seed(db: Client): Promise<void> {
  const i = ids;
  await db.query(`
    insert into orgs (id, name) values ('${i.orgA}', 'Org A'), ('${i.orgB}', 'Org B');
    insert into hospitals (id, org_id, name) values
      ('${i.hospA1}', '${i.orgA}', 'Hospital A1'),
      ('${i.hospA2}', '${i.orgA}', 'Hospital A2'),
      ('${i.hospB1}', '${i.orgB}', 'Hospital B1');
    insert into auth.users (id, email, raw_app_meta_data) values
      ('${i.adminA}', 'admin@a.test', '{"org_id":"${i.orgA}","role":"admin"}'),
      ('${i.coordA}', 'coord@a.test', '{"org_id":"${i.orgA}","role":"coordinator"}'),
      ('${i.partnerA1}', 'p1@a.test', '{"org_id":"${i.orgA}","role":"hospital_partner","hospital_id":"${i.hospA1}"}'),
      ('${i.partnerA2}', 'p2@a.test', '{"org_id":"${i.orgA}","role":"hospital_partner","hospital_id":"${i.hospA2}"}'),
      ('${i.viewerA}', 'viewer@a.test', '{"org_id":"${i.orgA}","role":"viewer"}'),
      ('${i.inactiveA}', 'gone@a.test', '{"org_id":"${i.orgA}","role":"coordinator"}'),
      ('${i.coordB}', 'coord@b.test', '{"org_id":"${i.orgB}","role":"coordinator"}');
    update profiles set is_active = false where user_id = '${i.inactiveA}';

    insert into patients (id, org_id, full_name, phone_e164) values
      ('${i.patReferredA1}', '${i.orgA}', 'Referred A1', '+919800000001'),
      ('${i.patReferredA2}', '${i.orgA}', 'Referred A2', '+919800000002'),
      ('${i.patNewA1}', '${i.orgA}', 'New A1', '+919800000003'),
      ('${i.patB}', '${i.orgB}', 'Patient B', '+919800000004');
    insert into leads (id, org_id, patient_id, stage, hospital_id) values
      ('${i.leadReferredA1}', '${i.orgA}', '${i.patReferredA1}', 4, '${i.hospA1}'),
      ('${i.leadReferredA2}', '${i.orgA}', '${i.patReferredA2}', 4, '${i.hospA2}'),
      ('${i.leadNewA1}', '${i.orgA}', '${i.patNewA1}', 0, '${i.hospA1}'),
      ('${i.leadB}', '${i.orgB}', '${i.patB}', 4, '${i.hospB1}');
    insert into conversations (id, org_id, patient_id, wa_phone_number_id)
      values (gen_random_uuid(), '${i.orgA}', '${i.patReferredA1}', 'wa1');
    insert into messages (org_id, conversation_id, direction, sender, type, body)
      select '${i.orgA}', id, 'in', 'patient', 'text', 'hello' from conversations;
    insert into documents (org_id, patient_id, lead_id, kind, storage_path, mime_type)
      values ('${i.orgA}', '${i.patReferredA1}', '${i.leadReferredA1}', 'aadhaar', '${i.orgA}/x/aadhaar.jpg', 'image/jpeg');
  `);
}
