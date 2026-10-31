export const STAGES = [
  { id: 0, key: "new" },
  { id: 1, key: "contacted" },
  { id: 2, key: "docs_pending" },
  { id: 3, key: "eligible" },
  { id: 4, key: "referred" },
  { id: 5, key: "admitted" },
] as const;

export const LOST = -1 as const;
export const BOT_MAX_STAGE = 3;
export type StageId = (typeof STAGES)[number]["id"] | typeof LOST;
export type StageKey = (typeof STAGES)[number]["key"] | "lost";

export function stageKey(id: number): StageKey {
  if (id === LOST) return "lost";
  return STAGES.find((s) => s.id === id)?.key ?? "new";
}

/** Mirrors the database rule in move_lead_stage(): bot may only move forward, up to Eligible. */
export function botMayMove(from: number, to: number): boolean {
  return from >= 0 && to > from && to <= BOT_MAX_STAGE;
}
