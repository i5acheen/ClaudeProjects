import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = [/^\/login/, /^\/auth\//, /^\/privacy-policy/, /^\/terms/, /^\/api\//];
const SESSION_MAX_AGE_S = 12 * 3600; // CLAUDE.md §10: 12 h session timeout

/** Refreshes the Supabase session cookie and sends signed-out users to /login. Role checks happen server-side per page. */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookieOptions: { maxAge: SESSION_MAX_AGE_S, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((r) => r.test(path))) return res;

  // Hard 12 h cap from sign-in, independent of refresh tokens.
  const signedIn = data.user?.last_sign_in_at ? Date.parse(data.user.last_sign_in_at) : 0;
  if (!data.user || Date.now() - signedIn > SESSION_MAX_AGE_S * 1000) {
    if (data.user) await supabase.auth.signOut();
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"] };
