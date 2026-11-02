/**
 * DEMO_MODE=1: prototype without a database (sample data in server memory, role picker instead of login).
 * Never set it on a deployment that holds real patient data.
 */
export const DEMO_ROLE_COOKIE = "hc_demo_role";
export const DEMO_ROLES = ["admin", "coordinator", "hospital_partner", "viewer"] as const;
export type DemoRoleName = (typeof DEMO_ROLES)[number];

export function isDemo(): boolean {
  return process.env.DEMO_MODE === "1" || process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export function parseDemoRole(v: string | undefined): DemoRoleName | null {
  return DEMO_ROLES.find((r) => r === v) ?? null;
}
