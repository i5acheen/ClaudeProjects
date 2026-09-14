import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  generatedText: z.string().optional(),
  status: z.enum(["DRAFT", "APPROVED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await prisma.policyDraft.findUnique({ where: { id: params.id } });
  if (!draft || draft.companyId !== session.companyId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const updated = await prisma.policyDraft.update({
    where: { id: draft.id },
    data: {
      ...(parsed.data.generatedText !== undefined ? { generatedText: parsed.data.generatedText } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  return NextResponse.json({ ok: true, draft: updated });
}
