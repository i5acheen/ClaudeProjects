import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
});

// No email/invite service in v1 — the admin gets a one-time temporary
// password to relay to the new teammate directly.
function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can add teammates." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "That email is already registered." }, { status: 409 });

  const temporaryPassword = generateTempPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await prisma.user.create({
    data: {
      companyId: session.companyId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "MEMBER",
    },
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
    temporaryPassword,
  });
}
