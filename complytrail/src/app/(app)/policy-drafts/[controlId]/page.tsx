import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPolicyDraftingEnabled } from "@/lib/anthropic";
import PolicyDraftWorkspace from "@/components/PolicyDraftWorkspace";

export default async function PolicyDraftPage({ params }: { params: { controlId: string } }) {
  const session = await requireSession();

  const control = await prisma.control.findUnique({ where: { id: params.controlId } });
  if (!control) notFound();

  const draft = await prisma.policyDraft.findUnique({
    where: { controlId_companyId: { controlId: control.id, companyId: session.companyId } },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/controls/${control.id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← {control.code}
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Draft a policy: {control.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{control.description}</p>
      </div>
      <PolicyDraftWorkspace
        controlId={control.id}
        aiEnabled={isPolicyDraftingEnabled()}
        initialDraft={
          draft
            ? {
                id: draft.id,
                generatedText: draft.generatedText,
                status: draft.status as "DRAFT" | "APPROVED",
                answers: JSON.parse(draft.questionnaireAnswers) as Record<string, string>,
              }
            : null
        }
      />
    </div>
  );
}
