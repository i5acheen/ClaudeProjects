import "server-only";
import { cookies } from "next/headers";
import { demoActor, demoClient } from "./client";
import { DEMO_USERS } from "./data";
import { DEMO_ROLE_COOKIE, parseDemoRole } from "./mode";

/** The demo client acting as the role chosen on the demo login screen (no role → signed out). */
export async function demoUserClient() {
  const role = parseDemoRole((await cookies()).get(DEMO_ROLE_COOKIE)?.value);
  if (!role) return demoClient(demoActor("viewer", null, null));
  const user = DEMO_USERS[role];
  return demoClient(demoActor(role, user.id, role === "hospital_partner" ? "00000000-0000-4000-8000-0000000000c1" : null));
}

export function demoServiceClient() {
  return demoClient(demoActor("service", null, null));
}
