import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "complytrail_session";
const SESSION_TTL = "7d";
const encoder = new TextEncoder();

export type SessionPayload = {
  userId: string;
  companyId: string;
  role: "ADMIN" | "MEMBER";
};

function getSecretKey() {
  // Falls back to a fixed secret when AUTH_SECRET isn't configured, rather
  // than trying to detect "is this a serverless demo deployment" — two
  // rounds of guessing which Vercel/AWS env vars are actually present at
  // runtime both turned out wrong, and a session system that silently
  // signs and verifies with different secrets across instances is worse
  // than a bug-class removed by just always having *a* secret.
  // Fine for a disposable demo; a real deployment should always set
  // AUTH_SECRET explicitly (e.g. `openssl rand -base64 32`) regardless.
  const secret = process.env.AUTH_SECRET || "complytrail-quick-demo-fallback-secret-do-not-use-in-production";
  return encoder.encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecretKey());
}

/** Never throws — a missing/invalid/expired token just means "no session". */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.companyId === "string" &&
      (payload.role === "ADMIN" || payload.role === "MEMBER")
    ) {
      return { userId: payload.userId, companyId: payload.companyId, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

/** For use in Server Components, Route Handlers, and Server Actions. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** For Server Components that require a signed-in user; redirects otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
