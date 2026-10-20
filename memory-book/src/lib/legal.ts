/**
 * Details shown on the legal pages. Fill in OPERATOR_NAME and OPERATOR_ADDRESS
 * before launch (Razorpay and Google both check them) — see PRODUCTION_CHECKLIST.md.
 */
export { GRIEVANCE_EMAIL } from "./consent";

export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "Memory Book";
export const OPERATOR_ADDRESS = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || "";
export const LEGAL_UPDATED = "20 October 2026";
