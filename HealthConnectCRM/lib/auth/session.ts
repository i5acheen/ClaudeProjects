import "server-only";
import { redirect } from "next/navigation";
import { userDb } from "@/lib/db/server";
import type { Tables } from "@/lib/db/types";

export type Role = Tables<"profiles">["role"];
export type Session = { userId: string; email: string | null; profile: Tables<"profiles"> };

/** Reads the user and their profile from the server; never trusts a client-supplied role. */
export async function getSession(): Promise<Session | null> {
  const db = await userDb();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await db.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (!profile || !profile.is_active) return null;
  return { userId: auth.user.id, email: auth.user.email ?? null, profile };
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles.length && !roles.includes(s.profile.role)) {
    redirect(s.profile.role === "hospital_partner" ? "/portal" : "/dashboard");
  }
  return s;
}

/** For server actions: throws instead of redirecting. */
export async function assertRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s || (roles.length && !roles.includes(s.profile.role))) throw new Error("Forbidden");
  return s;
}

export function homeFor(role: Role): string {
  return role === "hospital_partner" ? "/portal" : "/dashboard";
}
