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
  let secret = process.env.AUTH_SECRET;
  const isServerlessDemo = !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );
  if (!secret && isServerlessDemo) {
    // Quick-demo fallback only: a manually-deployed preview has no way to set
    // platform env vars from here, and a bundled .env file isn't reliably
    // loaded by the serverless function runtime. Never rely on this for a
    // real deployment — set AUTH_SECRET explicitly instead.
    secret = "complytrail-quick-demo-fallback-secret-do-not-use-in-production";
  }
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.example to .env and set AUTH_SECRET (e.g. `openssl rand -base64 32`)."
    );
  }
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
