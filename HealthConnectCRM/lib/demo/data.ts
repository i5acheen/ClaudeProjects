import "server-only";

/**
 * Sample data for DEMO_MODE (prototype without a database). Every patient is fictional and marked
 * "SAMPLE"; phone numbers use the +91 90000 xxxxx test range. Dates are relative to server start.
 */
export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export const DEMO_ORG = "00000000-0000-4000-8000-000000000001";
export const DEMO_USERS = {
  admin: { id: "d0000000-0000-4000-8000-000000000001", name: "Asha Kulkarni (Admin)", email: "admin@demo.healthconnect" },
  coordinator: { id: "d0000000-0000-4000-8000-000000000002", name: "Priya Jadhav", email: "priya@demo.healthconnect" },
  coordinator2: { id: "d0000000-0000-4000-8000-000000000003", name: "Rahul Shinde", email: "rahul@demo.healthconnect" },
  hospital_partner: {
    id: "d0000000-0000-4000-8000-000000000004",
    name: "Dr. Mehta (Vascular Hospital)",
    email: "partner@demo.healthconnect",
  },
  viewer: { id: "d0000000-0000-4000-8000-000000000005", name: "Board viewer", email: "viewer@demo.healthconnect" },
} as const;

const H = {
  vascular: "00000000-0000-4000-8000-0000000000c1",
  spine: "00000000-0000-4000-8000-0000000000c2",
  thyroid: "00000000-0000-4000-8000-0000000000c3",
};
const C = {
  varicose: "00000000-0000-4000-8000-0000000000d1",
  spine: "00000000-0000-4000-8000-0000000000d2",
  thyroid: "00000000-0000-4000-8000-0000000000d3",
};

const FIRST = [
  "Sunita",
  "Ramesh",
  "Fatima",
  "Vithal",
  "Anita",
  "Prakash",
  "Sangita",
  "Mahesh",
  "Shabana",
  "Dnyaneshwar",
  "Kavita",
  "Sanjay",
  "Rekha",
  "Bhausaheb",
  "Meena",
  "Ganesh",
  "Nirmala",
  "Arjun",
  "Lata",
  "Suresh",
];
const LAST = ["P.", "K.", "S.", "D.", "J.", "M.", "G.", "W.", "B.", "T."];
const PLACES: [string, string][] = [
  ["Paithan", "Chhatrapati Sambhajinagar"],
  ["Vaijapur", "Chhatrapati Sambhajinagar"],
  ["Gangapur", "Chhatrapati Sambhajinagar"],
  ["Sillod", "Chhatrapati Sambhajinagar"],
  ["Ambad", "Jalna"],
  ["Partur", "Jalna"],
  ["Georai", "Beed"],
  ["Majalgaon", "Beed"],
];
const TREATMENTS: { name: string; campaign: string; hospital: string }[] = [
  { name: "varicose veins", campaign: C.varicose, hospital: H.vascular },
  { name: "spine surgery", campaign: C.spine, hospital: H.spine },
  { name: "thyroid", campaign: C.thyroid, hospital: H.thyroid },
];
// stage distribution for 40 leads: New 7, Contacted 8, Docs 7, Eligible 6, Referred 5, Admitted 4, Lost 3
const STAGES = [
  ...Array(7).fill(0),
  ...Array(8).fill(1),
  ...Array(7).fill(2),
  ...Array(6).fill(3),
  ...Array(5).fill(4),
  ...Array(4).fill(5),
  ...Array(3).fill(-1),
];

// RFC 4122 v4-shaped ids (version 4, variant 8) so zod's strict uuid() accepts them.
const uuid = (prefix: string, n: number) => `${prefix.padEnd(8, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

export function buildDemoData(now = Date.now()): Tables {
  const iso = (ms: number) => new Date(ms).toISOString();
  const h = 3600_000;
  const d = 24 * h;
  const t: Tables = {
    orgs: [
      {
        id: DEMO_ORG,
        name: "HealthConnect (demo)",
        settings: {
          bot: { enabled: true },
          meta_form_ids: [],
          meta_field_mappings: {},
          retention: { document_days: 90, anonymise_days: 365 },
        },
        created_at: iso(now - 60 * d),
        updated_at: iso(now),
      },
    ],
    hospitals: [
      {
        id: H.vascular,
        org_id: DEMO_ORG,
        name: "SAMPLE Vascular Hospital",
        address: "Jalna Road",
        district: "Chhatrapati Sambhajinagar",
        empanelled_schemes: ["MJPJAY", "PM-JAY"],
        specialties: ["vascular"],
        contact_name: "Dr. Mehta",
        contact_phone: "+919000000101",
        is_active: true,
      },
      {
        id: H.spine,
        org_id: DEMO_ORG,
        name: "SAMPLE Spine Centre",
        address: "Station Road",
        district: "Jalna",
        empanelled_schemes: ["MJPJAY"],
        specialties: ["spine", "orthopaedics"],
        contact_name: "Dr. Patil",
        contact_phone: "+919000000102",
        is_active: true,
      },
      {
        id: H.thyroid,
        org_id: DEMO_ORG,
        name: "SAMPLE Thyroid & ENT Clinic",
        address: "CIDCO N-4",
        district: "Chhatrapati Sambhajinagar",
        empanelled_schemes: ["PM-JAY"],
        specialties: ["thyroid", "ent"],
        contact_name: "Dr. Khan",
        contact_phone: "+919000000103",
        is_active: true,
      },
    ],
    campaigns: [
      {
        id: C.varicose,
        org_id: DEMO_ORG,
        meta_campaign_id: "C100",
        meta_adset_id: "AS100",
        meta_ad_id: "AD100",
        name: "Varicose veins – Marathi video",
        treatment: "varicose veins",
        language: "mr",
      },
      {
        id: C.spine,
        org_id: DEMO_ORG,
        meta_campaign_id: "C200",
        meta_adset_id: "AS200",
        meta_ad_id: "AD200",
        name: "Spine surgery – Hindi carousel",
        treatment: "spine surgery",
        language: "hi",
      },
      {
        id: C.thyroid,
        org_id: DEMO_ORG,
        meta_campaign_id: "C300",
        meta_adset_id: "AS300",
        meta_ad_id: "AD300",
        name: "Thyroid – Marathi image",
        treatment: "thyroid",
        language: "mr",
      },
    ],
    profiles: [
      {
        user_id: DEMO_USERS.admin.id,
        org_id: DEMO_ORG,
        full_name: DEMO_USERS.admin.name,
        email: DEMO_USERS.admin.email,
        role: "admin",
        hospital_id: null,
        is_active: true,
      },
      {
        user_id: DEMO_USERS.coordinator.id,
        org_id: DEMO_ORG,
        full_name: DEMO_USERS.coordinator.name,
        email: DEMO_USERS.coordinator.email,
        role: "coordinator",
        hospital_id: null,
        is_active: true,
      },
      {
        user_id: DEMO_USERS.coordinator2.id,
        org_id: DEMO_ORG,
        full_name: DEMO_USERS.coordinator2.name,
        email: DEMO_USERS.coordinator2.email,
        role: "coordinator",
        hospital_id: null,
        is_active: true,
      },
      {
        user_id: DEMO_USERS.hospital_partner.id,
        org_id: DEMO_ORG,
        full_name: DEMO_USERS.hospital_partner.name,
        email: DEMO_USERS.hospital_partner.email,
        role: "hospital_partner",
        hospital_id: H.vascular,
        is_active: true,
      },
      {
        user_id: DEMO_USERS.viewer.id,
        org_id: DEMO_ORG,
        full_name: DEMO_USERS.viewer.name,
        email: DEMO_USERS.viewer.email,
        role: "viewer",
        hospital_id: null,
        is_active: true,
      },
    ],
    patients: [],
    leads: [],
    lead_facts: [],
    conversations: [],
    messages: [],
    documents: [],
    stage_events: [],
    tasks: [],
    notes: [],
    consents: [],
    notifications: [],
    audit_log: [],
    bot_runs: [],
    webhook_events: [],
    calls: [],
    wa_templates: [
      {
        id: uuid("e1", 1),
        org_id: DEMO_ORG,
        name: "lead_greeting_mr",
        language: "mr",
        category: "utility",
        status: "APPROVED",
        body_preview: "नमस्कार {{1}} जी, आपण उपचाराबद्दल चौकशी केली होती. आम्ही मोफत मदत करतो. आपली समस्या थोडक्यात सांगाल का?",
        variables: ["name"],
        is_enabled: true,
      },
      {
        id: uuid("e1", 2),
        org_id: DEMO_ORG,
        name: "lead_greeting_hi",
        language: "hi",
        category: "utility",
        status: "APPROVED",
        body_preview: "नमस्ते {{1}} जी, आपने इलाज के बारे में पूछा था। हम मुफ्त मदद करते हैं।",
        variables: ["name"],
        is_enabled: true,
      },
      {
        id: uuid("e1", 3),
        org_id: DEMO_ORG,
        name: "docs_reminder_mr",
        language: "mr",
        category: "utility",
        status: "APPROVED",
        body_preview: "नमस्कार जी, कृपया आधार, रेशन कार्ड आणि योजना कार्डचे फोटो या चॅटवर पाठवा.",
        variables: [],
        is_enabled: true,
      },
      {
        id: uuid("e1", 4),
        org_id: DEMO_ORG,
        name: "visit_confirmation_mr",
        language: "mr",
        category: "utility",
        status: "APPROVED",
        body_preview: "आपली भेट {{1}} येथे {{2}} रोजी {{3}} वाजता ठरली आहे.",
        variables: ["hospital", "date", "time"],
        is_enabled: true,
      },
      {
        id: uuid("e1", 5),
        org_id: DEMO_ORG,
        name: "reengage_mr",
        language: "mr",
        category: "marketing",
        status: "PENDING",
        body_preview: "नमस्कार जी, उपचारासाठी अजूनही मदत हवी असल्यास उत्तर द्या.",
        variables: [],
        is_enabled: true,
      },
    ],
    kb_articles: [
      {
        id: uuid("e2", 1),
        org_id: DEMO_ORG,
        title: "सेवा मोफत आहे का?",
        body: "होय. आमची समन्वय सेवा रुग्णांसाठी मोफत आहे. पात्रता योजना आणि रुग्णालय ठरवतात.",
        language: "mr",
        is_published: true,
        created_at: iso(now - 30 * d),
      },
      {
        id: uuid("e2", 2),
        org_id: DEMO_ORG,
        title: "कोणती कागदपत्रे लागतात?",
        body: "आधार कार्ड, रेशन कार्ड आणि असल्यास आयुष्मान भारत / MJPJAY कार्ड.",
        language: "mr",
        is_published: true,
        created_at: iso(now - 30 * d),
      },
    ],
  };

  // Staff mobiles used for call tracking (test range).
  const STAFF_PHONES: Record<string, string | null> = {
    [DEMO_USERS.admin.id]: "+919000090001",
    [DEMO_USERS.coordinator.id]: "+919000090002",
    [DEMO_USERS.coordinator2.id]: "+919000090003",
  };
  t.profiles.forEach((p) => (p.phone_e164 = STAFF_PHONES[String(p.user_id)] ?? null));

  const coordinators = [DEMO_USERS.coordinator.id, DEMO_USERS.coordinator2.id];
  STAGES.forEach((stage, i) => {
    const n = i + 1;
    const tr = TREATMENTS[i % 3];
    const [taluka, district] = PLACES[i % PLACES.length];
    const lang = i % 5 === 1 ? "hi" : "mr";
    const patientId = uuid("a1", n);
    const leadId = uuid("b1", n);
    const convId = uuid("c1", n);
    const createdAt = now - (i % 7 === 0 ? 2 * h : (i % 30) * d + (i % 5) * h);
    const assigned = coordinators[i % 2];
    const hospital = stage >= 4 ? tr.hospital : stage === 3 && i % 2 ? tr.hospital : null;
    const closed = stage === 5 || stage === -1 ? iso(createdAt + 10 * d > now ? now - h : createdAt + 10 * d) : null;
    t.patients.push({
      id: patientId,
      org_id: DEMO_ORG,
      full_name: `SAMPLE — ${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`,
      phone_e164: `+9190000${String(10000 + n).slice(-5)}`,
      age: 35 + ((i * 7) % 35),
      gender: i % 2 ? "female" : "male",
      district,
      taluka,
      preferred_language: lang,
      consent_whatsapp: true,
      consent_at: iso(createdAt),
      consent_source: "meta_lead_form",
      opted_out_at: null,
      deleted_at: null,
      created_at: iso(createdAt),
      updated_at: iso(createdAt),
    });
    t.leads.push({
      id: leadId,
      org_id: DEMO_ORG,
      patient_id: patientId,
      source: i % 6 === 5 ? "whatsapp" : "meta_lead_ad",
      campaign_id: i % 6 === 5 ? null : tr.campaign,
      meta_leadgen_id: i % 6 === 5 ? null : `SAMPLE-LG-${n}`,
      meta_form_id: "F1",
      treatment: tr.name,
      scheme: i % 3 === 0 ? "MJPJAY" : i % 3 === 1 ? "PM-JAY" : "unknown",
      stage,
      lost_reason: stage === -1 ? ["Not reachable after 3 calls", "Not eligible (no scheme card)", "Chose private hospital"][i % 3] : null,
      assigned_to: assigned,
      hospital_id: hospital,
      visit_at: stage >= 4 ? iso(stage === 4 ? now + ((i % 4) + 1) * d : createdAt + 8 * d) : null,
      bot_enabled: true,
      needs_human: [3, 10, 17].includes(i),
      needs_human_since: [3, 10, 17].includes(i) ? iso(now - (i + 5) * 60_000) : null,
      last_inbound_at: stage >= 1 ? iso(Math.min(now - h, createdAt + 3 * h)) : null,
      last_outbound_at: iso(createdAt + 60_000),
      next_action_at: null,
      admitted_at: stage === 5 ? closed : null,
      closed_at: closed,
      archived_at: null,
      created_at: iso(createdAt),
      updated_at: iso(Math.max(createdAt, now - (i % 9) * h)),
    });
    // stage history
    for (let s = 1; s <= Math.max(stage, 0); s++) {
      t.stage_events.push({
        id: uuid("f1", n * 10 + s),
        org_id: DEMO_ORG,
        lead_id: leadId,
        from_stage: s - 1,
        to_stage: s,
        actor_type: s <= 2 ? "bot" : s === 5 && i % 2 ? "user" : "user",
        actor_user_id: s <= 2 ? null : assigned,
        reason: ["", "patient replied", "documents requested", "documents verified", "visit booked", "admitted"][s],
        created_at: iso(createdAt + s * 12 * h),
      });
    }
    t.stage_events.unshift({
      id: uuid("f1", n * 10),
      org_id: DEMO_ORG,
      lead_id: leadId,
      from_stage: null,
      to_stage: 0,
      actor_type: "system",
      actor_user_id: null,
      reason: "Meta lead received",
      created_at: iso(createdAt),
    });
    if (stage === -1)
      t.stage_events.push({
        id: uuid("f1", n * 10 + 9),
        org_id: DEMO_ORG,
        lead_id: leadId,
        from_stage: 1,
        to_stage: -1,
        actor_type: "user",
        actor_user_id: assigned,
        reason: t.leads.at(-1)!.lost_reason,
        created_at: closed,
      });
    // conversation + messages
    t.conversations.push({
      id: convId,
      org_id: DEMO_ORG,
      patient_id: patientId,
      wa_phone_number_id: "DEMO-PN",
      window_expires_at: iso(stage >= 1 && i % 3 ? now + 20 * h : now - 2 * h),
      status: "open",
      unread_count: [3, 10, 17, 8].includes(i) ? 1 + (i % 2) : 0,
      created_at: iso(createdAt),
      updated_at: iso(now - (i % 12) * h),
    });
    const name = FIRST[i % FIRST.length];
    const msgs: [string, string, string, string, number][] = [
      ["out", "system", "template", lang === "hi" ? `[template lead_greeting_hi] ${name}` : `[template lead_greeting_mr] ${name}`, 1],
    ];
    if (stage >= 1) {
      msgs.push([
        "in",
        "patient",
        "text",
        lang === "hi" ? "नमस्ते, मुझे पैर की नसों में दर्द है, 2 साल से" : "नमस्कार, माझ्या पायाच्या नसा फुगल्या आहेत, दोन वर्षांपासून",
        2,
      ]);
      msgs.push(["out", "coordinator", "text", lang === "hi" ? "धन्यवाद जी। आपकी उम्र कितनी है?" : "धन्यवाद जी. आपले वय किती आहे?", 3]);
      msgs.push(["in", "patient", "text", `${35 + ((i * 7) % 35)}, ${taluka}`, 4]);
    }
    if (stage >= 2) {
      msgs.push(["out", "coordinator", "text", "कृपया आधार कार्ड, रेशन कार्ड आणि योजना कार्डचे फोटो पाठवा.", 5]);
      msgs.push(["in", "patient", "image", "आधार कार्ड", 6]);
    }
    if ([3, 10, 17].includes(i)) msgs.push(["in", "patient", "text", "मला माणसाशी बोलायचं आहे", 7]);
    msgs.forEach(([direction, sender, type, body, k]) => {
      t.messages.push({
        id: uuid("f2", n * 20 + k),
        org_id: DEMO_ORG,
        conversation_id: convId,
        lead_id: leadId,
        direction,
        sender,
        sender_user_id: sender === "coordinator" ? assigned : null,
        type,
        body,
        template_name: type === "template" ? (lang === "hi" ? "lead_greeting_hi" : "lead_greeting_mr") : null,
        media_id: null,
        wa_media_id: null,
        wa_message_id: `wamid.DEMO.${n}.${k}`,
        status: direction === "in" ? "received" : k > 3 ? "delivered" : "read",
        error_code: null,
        is_internal_note: false,
        created_at: iso(createdAt + k * 40 * 60_000),
        updated_at: iso(createdAt + k * 40 * 60_000),
      });
    });
    // calls from the assigned coordinator's mobile: Priya calls more and connects more often than Rahul
    const phoneOf = assigned === DEMO_USERS.coordinator.id ? "+919000090002" : "+919000090003";
    const attempts: [string, number | null, string | null][] =
      stage === 0
        ? i % 2 === 0
          ? []
          : [["no_answer", null, null]]
        : stage === -1
          ? [
              ["no_answer", null, null],
              ["switched_off", null, null],
              ["no_answer", null, "3rd attempt — marking lost"],
            ]
          : assigned === DEMO_USERS.coordinator.id
            ? [
                ["connected", 240 + (i % 5) * 60, "Explained the scheme process; will send documents"],
                ...(stage >= 3
                  ? ([["connected", 180, "Documents verified on call; discussed hospital options"]] as [string, number, string][])
                  : []),
              ]
            : [
                ["no_answer", null, null],
                ["busy", null, null],
                ["connected", 120 + (i % 3) * 60, "Patient interested; asked to call back with documents"],
              ];
    attempts.forEach(([outcome, secs, note], k) => {
      const at = Math.min(now - 10 * 60_000, createdAt + (k + 1) * 50 * 60_000 + (i % 4) * 7 * 60_000);
      t.calls.push({
        id: uuid("f9", n * 10 + k),
        org_id: DEMO_ORG,
        lead_id: leadId,
        user_id: assigned,
        staff_phone: phoneOf,
        started_at: iso(at),
        outcome,
        duration_seconds: secs,
        notes: note,
        created_at: iso(at),
        updated_at: iso(at),
      });
    });

    // facts
    if (stage >= 1) {
      const facts: [string, string][] = [
        ["problem", tr.name],
        ["since", "2 years"],
        ["age", String(35 + ((i * 7) % 35))],
        ["district", `${taluka}, ${district}`],
      ];
      if (stage >= 2) facts.push(["aadhaar", "yes"], ["ration_card", i % 2 ? "yes, orange" : "yes, yellow"]);
      if (stage >= 3) facts.push(["scheme_card", i % 3 === 1 ? "Ayushman Bharat" : "MJPJAY"]);
      facts.forEach(([key, value], k) =>
        t.lead_facts.push({
          lead_id: leadId,
          org_id: DEMO_ORG,
          key,
          value,
          source: k < 4 ? "form" : "coordinator",
          confidence: 1,
          created_at: iso(createdAt),
          updated_at: iso(createdAt + k * h),
        }),
      );
    }
    // documents
    if (stage >= 2) {
      (stage >= 3 ? ["aadhaar", "ration_card", "scheme_card"] : ["aadhaar"]).forEach((kind, k) =>
        t.documents.push({
          id: uuid("f3", n * 10 + k),
          org_id: DEMO_ORG,
          patient_id: patientId,
          lead_id: leadId,
          kind,
          storage_path: `${DEMO_ORG}/${patientId}/${kind}.jpg`,
          mime_type: "image/jpeg",
          size_bytes: 180_000,
          verified_by: stage >= 3 ? assigned : null,
          verified_at: stage >= 3 ? iso(createdAt + 2 * d) : null,
          created_at: iso(createdAt + d),
        }),
      );
    }
    // tasks
    if (stage === 0 && i % 2 === 0)
      t.tasks.push({
        id: uuid("f4", n),
        org_id: DEMO_ORG,
        lead_id: leadId,
        assigned_to: assigned,
        type: "call",
        due_at: iso(now - (i % 3) * 2 * h),
        done_at: null,
      });
    if (stage === 2)
      t.tasks.push({
        id: uuid("f4", n + 100),
        org_id: DEMO_ORG,
        lead_id: leadId,
        assigned_to: assigned,
        type: "chase_docs",
        due_at: iso(now + (i % 3) * h - 2 * h),
        done_at: null,
      });
    if (stage === 3)
      t.tasks.push({
        id: uuid("f4", n + 200),
        org_id: DEMO_ORG,
        lead_id: leadId,
        assigned_to: assigned,
        type: "book_visit",
        due_at: iso(now + 3 * h),
        done_at: null,
      });
    if (stage === 4)
      t.tasks.push({
        id: uuid("f4", n + 300),
        org_id: DEMO_ORG,
        lead_id: leadId,
        assigned_to: assigned,
        type: "confirm_admission",
        due_at: iso(now + 26 * h),
        done_at: null,
      });
    if (stage >= 2 && i % 4 === 0)
      t.notes.push({
        id: uuid("f5", n),
        org_id: DEMO_ORG,
        lead_id: leadId,
        author_id: assigned,
        body: "Called patient — will send documents this evening. Prefers Marathi.",
        created_at: iso(createdAt + 30 * h),
      });
    t.consents.push({
      id: uuid("f6", n),
      org_id: DEMO_ORG,
      patient_id: patientId,
      purpose: "whatsapp_contact",
      granted: true,
      text_shown: "I agree to be contacted on WhatsApp about my treatment enquiry.",
      source: "meta_lead_form:F1",
      created_at: iso(createdAt),
    });
    if ([3, 10, 17].includes(i)) {
      for (const uid of [assigned])
        t.notifications.push({
          id: uuid("f7", n),
          org_id: DEMO_ORG,
          user_id: uid,
          lead_id: leadId,
          kind: "needs_human",
          body: "Patient needs a coordinator (asked_for_person).",
          read_at: null,
          created_at: iso(now - (i + 5) * 60_000),
        });
    }
  });
  t.notifications.push({
    id: uuid("f7", 900),
    org_id: DEMO_ORG,
    user_id: DEMO_USERS.coordinator.id,
    lead_id: uuid("b1", 1),
    kind: "call_lead",
    body: "No reply to greeting for 2 hours — please call.",
    read_at: null,
    created_at: iso(now - 30 * 60_000),
  });
  t.audit_log.push({
    id: uuid("f8", 1),
    org_id: DEMO_ORG,
    actor_user_id: DEMO_USERS.admin.id,
    action: "profile.created",
    entity: "profiles",
    entity_id: DEMO_USERS.coordinator.id,
    before: null,
    after: { role: "coordinator" },
    created_at: iso(now - 50 * d),
  });
  return t;
}
