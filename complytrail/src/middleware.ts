import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, verifySessionToken, type SessionPayload } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register"];

// Fixed ids from seed-data.ts — stable across any lazily-seeded serverless
// instance, unlike a real login's randomly generated user id.
const DEMO_SESSION: SessionPayload = {
  userId: "seed-user-priya",
  companyId: "seed-company-aurora",
  role: "ADMIN",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/trust/") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    // Testing-only bypass: skips the login/register flow entirely so the
    // deployed demo can be clicked through without the serverless-SQLite
    // session mismatch. Never set DEMO_MODE on a deployment with real data.
    if (process.env.DEMO_MODE === "1") {
      const demoToken = await createSessionToken(DEMO_SESSION);
      const response = NextResponse.next();
      response.cookies.set(SESSION_COOKIE, demoToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
