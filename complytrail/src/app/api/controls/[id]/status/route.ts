import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  status: z.enum(["MISSING", "IN_PROGRESS", "EVIDENCE_ATTACHED"]).optional(),
  ownerId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const control = await prisma.control.findUnique({ where: { id: params.id } });
  if (!control) return NextResponse.json({ error: "Control not found." }, { status: 404 });

  if (parsed.data.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerId, companyId: session.companyId },
    });
    if (!owner) return NextResponse.json({ error: "That person isn't on your team." }, { status: 400 });
  }

  const controlStatus = await prisma.controlStatus.upsert({
    where: { controlId_companyId: { controlId: control.id, companyId: session.companyId } },
    update: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.ownerId !== undefined ? { ownerId: parsed.data.ownerId } : {}),
    },
    create: {
      controlId: control.id,
      companyId: session.companyId,
      status: parsed.data.status ?? "MISSING",
      ownerId: parsed.data.ownerId ?? null,
    },
  });

  return NextResponse.json({ ok: true, controlStatus });
}
