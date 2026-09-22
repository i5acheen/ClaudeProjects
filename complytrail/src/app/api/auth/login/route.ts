import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken({ userId: user.id, companyId: user.companyId, role: user.role as Role });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Login failed", err);
    // Temporary diagnostic for the manually-deployed demo, where Vercel's own
    // log APIs aren't reachable from this session. Surfaces the real cause
    // instead of a bare 500 so it can be fixed without server log access.
    return NextResponse.json(
      {
        error: "Something went wrong signing in.",
        debug: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      },
      { status: 500 }
    );
  }
}
