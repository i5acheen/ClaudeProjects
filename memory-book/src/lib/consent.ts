/**
 * The privacy notice people agree to when they start a book (India's DPDP Act
 * asks for clear, specific consent — and here, confirmation that the person is
 * the child's parent or guardian). Bump the version whenever the notice changes.
 */

import { APP_NAME } from "@/content/marketing";

export const CONSENT_VERSION = "2026-10-20";

export const GRIEVANCE_EMAIL = "sacheen501@gmail.com";

export const CONSENT_POINTS = [
  `Your child's name, date of birth, photos and the memories you write are saved only in your own Google Drive, in a folder the app creates. ${APP_NAME}'s servers never receive them.`,
  "We use this only to make your book. No ads, no tracking, no profiling, and nothing is sold or shared.",
  "On our side we keep only a coded account number, when you agreed to this notice, and (if you upgrade) your plan.",
  "You can download everything, or delete your account, at any time in Settings. Taking back consent stops the app using your data; your book stays in your Drive unless you choose to delete it.",
  `Questions or complaints: ${GRIEVANCE_EMAIL}.`,
];
