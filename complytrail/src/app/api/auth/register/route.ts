import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  companyName: z.string().trim().min(1, "Company name is required").max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { name, email, password, companyName } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  // Multi-tenant: every registration spins up its own isolated company —
  // there is no single shared workspace to join. Teammates are added from
  // inside that workspace (Settings → Team), not through public signup.
  try {
    const company = await prisma.company.create({ data: { name: companyName } });
    const companyId = company.id;
    const role: "ADMIN" = "ADMIN";

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { companyId, name, email, passwordHash, role },
    });

    const token = await createSessionToken({ userId: user.id, companyId, role });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Registration failed", err);
    // Same temporary diagnostic as /api/auth/login — see that file for why.
    return NextResponse.json(
      {
        error: "Something went wrong creating your account.",
        debug: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      },
      { status: 500 }
    );
  }
}
