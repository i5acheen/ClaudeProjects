import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/format";
import type { ControlCategory, ControlStatusValue } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import StatusOwnerForm from "@/components/StatusOwnerForm";
import EvidenceUploadForm from "@/components/EvidenceUploadForm";

export default async function ControlDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();

  const control = await prisma.control.findUnique({ where: { id: params.id } });
  if (!control) notFound();

  const [controlStatus, evidence, users, policyDraft] = await Promise.all([
    prisma.controlStatus.findUnique({
      where: { controlId_companyId: { controlId: control.id, companyId: session.companyId } },
    }),
    prisma.evidence.findMany({
      where: { controlId: control.id, companyId: session.companyId },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.user.findMany({ where: { companyId: session.companyId }, select: { id: true, name: true } }),
    prisma.policyDraft.findUnique({
      where: { controlId_companyId: { controlId: control.id, companyId: session.companyId } },
    }),
  ]);

  const status = (controlStatus?.status ?? "MISSING") as ControlStatusValue;
  const hasEvidence = evidence.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← All controls
        </Link>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-slate-400">{control.code}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {CATEGORY_LABELS[control.category as ControlCategory]}
          </span>
          <StatusBadge status={status} />
        </div>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{control.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{control.description}</p>
      </div>

      <StatusOwnerForm
        controlId={control.id}
        initialStatus={status}
        initialOwnerId={controlStatus?.ownerId ?? null}
        users={users}
      />

      {!hasEvidence && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No evidence attached yet.{" "}
          {policyDraft ? (
            <Link href={`/policy-drafts/${control.id}`} className="font-medium underline">
              View the draft policy
            </Link>
          ) : (
            <>
              If there&apos;s no underlying policy for this yet either,{" "}
              <Link href={`/policy-drafts/${control.id}`} className="font-medium underline">
                draft one with the policy assistant
              </Link>
              .
            </>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Evidence</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-500">No evidence attached.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {evidence.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {item.type}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.uploadedBy.name} · {formatTimestamp(item.uploadedAt)}
                  </span>
                </div>
                <div className="mt-1.5">
                  {item.type === "FILE" && (
                    <a href={`/api/evidence/${item.id}/file`} className="text-brand-600 hover:underline">
                      {item.fileName ?? "Download file"}
                    </a>
                  )}
                  {item.type === "LINK" && (
                    <a
                      href={item.content}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-brand-600 hover:underline"
                    >
                      {item.content}
                    </a>
                  )}
                  {item.type === "NOTE" && <p className="whitespace-pre-wrap text-slate-700">{item.content}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <EvidenceUploadForm controlId={control.id} />
      </div>
    </div>
  );
}
