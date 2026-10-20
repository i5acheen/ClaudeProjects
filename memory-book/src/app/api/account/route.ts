import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { CONSENT_VERSION } from "@/lib/consent";
import { accountId, deleteAccount, getAccount, storeConfigured, updateAccount } from "@/lib/server/store";

/**
 * Your account record on our side (see lib/server/store.ts): consent, and
 * deleting your account. Only for the signed-in person, about themselves.
 */

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("consent"), version: z.literal(CONSENT_VERSION), guardian: z.literal(true) }),
  z.object({ action: z.literal("revoke-google") }),
  z.object({ action: z.literal("delete-account") }),
]);

/** Only requests from this website itself (protects against other sites submitting forms in your name). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: noStore });
  const account = await getAccount(accountId(session.user.email)).catch(() => null);
  return NextResponse.json(
    { storeConfigured: storeConfigured(), consentVersion: account?.consentVersion, consentAt: account?.consentAt, plan: account?.plan ?? "free" },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers: noStore });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: noStore });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  const id = accountId(session.user.email);

  try {
    switch (parsed.data.action) {
      case "consent":
        await updateAccount(id, { consentVersion: CONSENT_VERSION, consentAt: new Date().toISOString(), guardianConfirmed: true });
        return NextResponse.json({ ok: true }, { headers: noStore });
      case "revoke-google":
        await revokeGoogle(session.accessToken);
        return NextResponse.json({ ok: true }, { headers: noStore });
      case "delete-account":
        await deleteAccount(id);
        await revokeGoogle(session.accessToken);
        return NextResponse.json({ ok: true }, { headers: noStore });
    }
  } catch {
    // No details: the person sees a plain message; the server log has the request.
    return NextResponse.json({ error: "Couldn't do that just now. Please try again." }, { status: 503, headers: noStore });
  }
}

/** Tells Google to cancel Memory Book's access for this account (signing in again asks afresh). */
async function revokeGoogle(accessToken?: string) {
  if (!accessToken) return;
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: accessToken }),
  }).catch(() => undefined);
}
