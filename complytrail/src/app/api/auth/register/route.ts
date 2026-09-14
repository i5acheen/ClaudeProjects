import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  companyName: z.string().trim().max(200).optional(),
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

  // v1 supports a single workspace: the first person to register creates it
  // and becomes admin; everyone after joins that same company as a member.
  const existingCompany = await prisma.company.findFirst();

  let companyId: string;
  let role: "ADMIN" | "MEMBER";

  if (!existingCompany) {
    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required to set up your workspace." },
        { status: 400 }
      );
    }
    const company = await prisma.company.create({ data: { name: companyName } });
    companyId = company.id;
    role = "ADMIN";
  } else {
    companyId = existingCompany.id;
    role = "MEMBER";
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { companyId, name, email, passwordHash, role },
  });

  const token = await createSessionToken({ userId: user.id, companyId, role });
  setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
