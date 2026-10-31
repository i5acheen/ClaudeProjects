import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "healthconnectcrm" });

/** Event names (data validated with zod inside each function). */
export const EVENTS = {
  leadReceived: "meta/lead.received",
  waMessage: "whatsapp/message.received",
  waStatus: "whatsapp/status.received",
  leadCreated: "crm/lead.created",
  patientReplied: "crm/patient.replied",
  needsHuman: "crm/lead.needs_human",
  stageChanged: "crm/lead.stage_changed",
} as const;
