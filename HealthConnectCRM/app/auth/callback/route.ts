import { NextResponse, type NextRequest } from "next/server";
import { userDb } from "@/lib/db/server";

/** OAuth (Google) code exchange. Users without an active profile are signed out again. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const db = await userDb();
  if (code) await db.auth.exchangeCodeForSession(code);
  const { data } = await db.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", req.url));
  const { data: profile } = await db.from("profiles").select("role, is_active").eq("user_id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await db.auth.signOut();
    return NextResponse.redirect(new URL("/login?inactive=1", req.url));
  }
  return NextResponse.redirect(new URL(profile.role === "hospital_partner" ? "/portal" : "/dashboard", req.url));
}
