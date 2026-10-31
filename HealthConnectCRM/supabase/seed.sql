-- LOCAL / STAGING SEED ONLY. Every patient below is a clearly marked SAMPLE (name prefixed "SAMPLE —",
-- phone numbers in the +91 90000 000xx test range). Never run against production.
insert into orgs (id, name, settings) values
  ('00000000-0000-4000-8000-000000000001', 'HealthConnect (sample org)',
   '{"bot": {"enabled": true}, "meta_form_ids": [], "meta_field_mappings": {}, "retention": {"document_days": 90, "anonymise_days": 365}}');

insert into hospitals (id, org_id, name, district, empanelled_schemes, specialties, contact_name, contact_phone) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', 'SAMPLE Vascular Hospital', 'Chhatrapati Sambhajinagar', '{MJPJAY,PM-JAY}', '{vascular}', 'Dr. Sample A', '+919000000101'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001', 'SAMPLE Spine Centre', 'Jalna', '{MJPJAY}', '{spine}', 'Dr. Sample B', '+919000000102'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001', 'SAMPLE Thyroid Clinic', 'Chhatrapati Sambhajinagar', '{PM-JAY}', '{thyroid,ent}', 'Dr. Sample C', '+919000000103');

insert into campaigns (id, org_id, meta_campaign_id, meta_adset_id, meta_ad_id, name, treatment, language) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000001', 'C100', 'AS100', 'AD100', 'SAMPLE Varicose veins – Marathi', 'varicose veins', 'mr'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-000000000001', 'C200', 'AS200', 'AD200', 'SAMPLE Spine – Hindi', 'spine surgery', 'hi');

insert into kb_articles (org_id, title, body, language) values
  ('00000000-0000-4000-8000-000000000001', 'सेवा मोफत आहे का?', 'होय. आमची समन्वय सेवा रुग्णांसाठी पूर्णपणे मोफत आहे. योजनेअंतर्गत उपचारासाठी पात्रता योजना आणि रुग्णालय ठरवतात.', 'mr'),
  ('00000000-0000-4000-8000-000000000001', 'कोणती कागदपत्रे लागतात?', 'आधार कार्ड, रेशन कार्ड (पिवळे/केशरी/पांढरे) आणि असल्यास आयुष्मान भारत किंवा MJPJAY कार्ड. डॉक्टरांची चिठ्ठी किंवा रिपोर्ट असल्यास तेही उपयोगी.', 'mr'),
  ('00000000-0000-4000-8000-000000000001', 'प्रक्रिया कशी आहे?', '1) आम्ही माहिती व कागदपत्रे घेतो 2) पात्रता तपासतो 3) जवळच्या संलग्न रुग्णालयात भेट ठरवतो 4) दाखल होईपर्यंत मदत करतो.', 'mr'),
  ('00000000-0000-4000-8000-000000000001', 'Which documents are needed?', 'Aadhaar card, ration card, and an Ayushman Bharat or MJPJAY card if you have one.', 'en'),
  ('00000000-0000-4000-8000-000000000001', 'क्या सेवा मुफ्त है?', 'हाँ, हमारी समन्वय सेवा मरीज़ों के लिए मुफ्त है। योजना के तहत पात्रता योजना और अस्पताल तय करते हैं।', 'hi');

insert into wa_templates (org_id, name, language, category, status, body_preview, variables) values
  ('00000000-0000-4000-8000-000000000001', 'lead_greeting_mr', 'mr', 'utility', 'APPROVED', 'नमस्कार {{1}} जी, आपण उपचाराबद्दल चौकशी केली होती. आम्ही मोफत मदत करतो. आपली समस्या थोडक्यात सांगाल का?', '{name}'),
  ('00000000-0000-4000-8000-000000000001', 'lead_greeting_hi', 'hi', 'utility', 'APPROVED', 'नमस्ते {{1}} जी, आपने इलाज के बारे में पूछा था। हम मुफ्त मदद करते हैं। अपनी समस्या संक्षेप में बताएँगे?', '{name}'),
  ('00000000-0000-4000-8000-000000000001', 'docs_reminder_mr', 'mr', 'utility', 'APPROVED', 'नमस्कार जी, कृपया आधार, रेशन कार्ड आणि योजना कार्डचे फोटो या चॅटवर पाठवा.', '{}'),
  ('00000000-0000-4000-8000-000000000001', 'docs_reminder_hi', 'hi', 'utility', 'APPROVED', 'नमस्ते जी, कृपया आधार, राशन कार्ड और योजना कार्ड की फ़ोटो इस चैट पर भेजें।', '{}'),
  ('00000000-0000-4000-8000-000000000001', 'visit_confirmation_mr', 'mr', 'utility', 'APPROVED', 'आपली भेट {{1}} येथे {{2}} रोजी {{3}} वाजता ठरली आहे.', '{hospital,date,time}'),
  ('00000000-0000-4000-8000-000000000001', 'reengage_mr', 'mr', 'marketing', 'PENDING', 'नमस्कार जी, उपचारासाठी अजूनही मदत हवी असल्यास उत्तर द्या.', '{}');

-- SAMPLE patients across every stage
insert into patients (id, org_id, full_name, phone_e164, age, district, taluka, preferred_language, consent_whatsapp, consent_at, consent_source) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-000000000001', 'SAMPLE — Sunita P.', '+919000000001', 52, 'Chhatrapati Sambhajinagar', 'Paithan', 'mr', true, now(), 'meta_lead_form'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-000000000001', 'SAMPLE — Ramesh K.', '+919000000002', 61, 'Jalna', 'Ambad', 'mr', true, now(), 'meta_lead_form'),
  ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-000000000001', 'SAMPLE — Fatima S.', '+919000000003', 44, 'Chhatrapati Sambhajinagar', 'Vaijapur', 'hi', true, now(), 'whatsapp_inbound'),
  ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-000000000001', 'SAMPLE — Vithal D.', '+919000000004', 58, 'Beed', 'Georai', 'mr', true, now(), 'meta_lead_form'),
  ('00000000-0000-4000-8000-0000000000e5', '00000000-0000-4000-8000-000000000001', 'SAMPLE — Anita J.', '+919000000005', 39, 'Chhatrapati Sambhajinagar', 'Gangapur', 'mr', true, now(), 'meta_lead_form'),
  ('00000000-0000-4000-8000-0000000000e6', '00000000-0000-4000-8000-000000000001', 'SAMPLE — Prakash M.', '+919000000006', 66, 'Jalna', 'Partur', 'mr', true, now(), 'meta_lead_form');

insert into leads (id, org_id, patient_id, source, campaign_id, meta_leadgen_id, treatment, scheme, stage, hospital_id, visit_at, admitted_at, closed_at, lost_reason) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'meta_lead_ad', '00000000-0000-4000-8000-0000000000d1', 'SAMPLE-LG-1', 'varicose veins', 'MJPJAY', 0, null, null, null, null, null),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e2', 'meta_lead_ad', '00000000-0000-4000-8000-0000000000d2', 'SAMPLE-LG-2', 'spine surgery', 'MJPJAY', 2, null, null, null, null, null),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e3', 'whatsapp', null, null, 'thyroid', 'PM-JAY', 3, null, null, null, null, null),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e4', 'meta_lead_ad', '00000000-0000-4000-8000-0000000000d1', 'SAMPLE-LG-4', 'varicose veins', 'PM-JAY', 4, '00000000-0000-4000-8000-0000000000c1', now() + interval '2 days', null, null, null),
  ('00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e5', 'meta_lead_ad', '00000000-0000-4000-8000-0000000000d1', 'SAMPLE-LG-5', 'varicose veins', 'MJPJAY', 5, '00000000-0000-4000-8000-0000000000c1', now() - interval '3 days', now() - interval '1 day', now() - interval '1 day', null),
  ('00000000-0000-4000-8000-0000000000f6', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e6', 'meta_lead_ad', '00000000-0000-4000-8000-0000000000d2', 'SAMPLE-LG-6', 'spine surgery', 'unknown', -1, null, null, null, now(), 'SAMPLE: not reachable');

insert into stage_events (org_id, lead_id, from_stage, to_stage, actor_type, reason)
select l.org_id, l.id, s.from_stage, s.to_stage, 'system', 'seed'
from leads l
cross join lateral (
  select g - 1 as from_stage, g as to_stage from generate_series(1, greatest(l.stage, 0)) g
) s;

insert into conversations (org_id, patient_id, wa_phone_number_id, window_expires_at)
select org_id, id, 'SAMPLE-PNID', now() + interval '20 hours' from patients;

insert into messages (org_id, conversation_id, lead_id, direction, sender, type, body, status, created_at)
select c.org_id, c.id, l.id, 'in', 'patient', 'text', 'SAMPLE: माझ्या पायाच्या नसा फुगल्या आहेत', 'received', now() - interval '2 hours'
from conversations c join leads l on l.patient_id = c.patient_id;
