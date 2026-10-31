import { docsPendingFollowups, leadFollowups, needsHumanEscalation } from "./automations";
import { leadReceived } from "./lead-received";
import { metaBackfill, nightlyMaintenance } from "./scheduled";
import { waMessageReceived } from "./wa-message-received";
import { waStatus } from "./wa-status";

export const functions = [leadReceived, waMessageReceived, waStatus, leadFollowups, docsPendingFollowups, needsHumanEscalation, metaBackfill, nightlyMaintenance];
