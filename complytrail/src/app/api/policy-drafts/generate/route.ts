import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePolicyDraft, isPolicyDraftingEnabled } from "@/lib/anthropic";

const schema = z.object({
  controlId: z.string(),
  answers: z.record(z.string(), z.string()),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPolicyDraftingEnabled()) {
    return NextResponse.json(
      { error: "Policy drafting isn't configured. Set ANTHROPIC_API_KEY to enable it." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const [control, company] = await Promise.all([
    prisma.control.findUnique({ where: { id: parsed.data.controlId } }),
    prisma.company.findUnique({ where: { id: session.companyId } }),
  ]);
  if (!control || !company) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let generatedText: string;
  try {
    generatedText = await generatePolicyDraft({
      controlTitle: control.title,
      controlDescription: control.description,
      companyName: company.name,
      answers: parsed.data.answers,
    });
  } catch (err) {
    console.error("Policy draft generation failed", err);
    return NextResponse.json(
      { error: "Claude couldn't generate a draft right now. Try again in a moment." },
      { status: 502 }
    );
  }

  const draft = await prisma.policyDraft.upsert({
    where: { controlId_companyId: { controlId: control.id, companyId: session.companyId } },
    update: {
      questionnaireAnswers: JSON.stringify(parsed.data.answers),
      generatedText,
      status: "DRAFT",
    },
    create: {
      controlId: control.id,
      companyId: session.companyId,
      questionnaireAnswers: JSON.stringify(parsed.data.answers),
      generatedText,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ ok: true, draft });
}
