import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ auditDate: z.string().nullable() });

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change this." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  let auditDate: Date | null = null;
  if (parsed.data.auditDate) {
    const d = new Date(parsed.data.auditDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
    auditDate = d;
  }

  const company = await prisma.company.update({ where: { id: session.companyId }, data: { auditDate } });
  return NextResponse.json({ ok: true, company });
}
