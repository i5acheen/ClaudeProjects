import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EVIDENCE_ROOT, MAX_EVIDENCE_FILE_BYTES } from "@/lib/storage";

const EVIDENCE_TYPES = ["FILE", "LINK", "NOTE"] as const;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const controlId = String(formData.get("controlId") ?? "");
  const type = String(formData.get("type") ?? "");
  if (!controlId || !EVIDENCE_TYPES.includes(type as (typeof EVIDENCE_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const control = await prisma.control.findUnique({ where: { id: controlId } });
  if (!control) return NextResponse.json({ error: "Control not found." }, { status: 404 });

  let content: string;
  let fileName: string | undefined;
  let mimeType: string | undefined;

  if (type === "FILE") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a file to attach." }, { status: 400 });
    }
    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      return NextResponse.json({ error: "File is larger than 10MB." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "evidence";
    const relativePath = `${session.companyId}/${randomUUID()}-${safeName}`;
    const fullPath = path.join(EVIDENCE_ROOT, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, bytes);
    content = relativePath;
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
  } else if (type === "LINK") {
    const link = String(formData.get("content") ?? "").trim();
    if (!link) return NextResponse.json({ error: "Enter a link." }, { status: 400 });
    try {
      new URL(link);
    } catch {
      return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
    }
    content = link;
  } else {
    const note = String(formData.get("content") ?? "").trim();
    if (!note) return NextResponse.json({ error: "Enter a note." }, { status: 400 });
    content = note;
  }

  const evidence = await prisma.evidence.create({
    data: {
      controlId,
      companyId: session.companyId,
      type: type as (typeof EVIDENCE_TYPES)[number],
      content,
      fileName,
      mimeType,
      uploadedById: session.userId,
    },
  });

  // Attaching evidence means there's something to show an auditor now —
  // move the control forward unless someone already marked it further along.
  await prisma.controlStatus.upsert({
    where: { controlId_companyId: { controlId, companyId: session.companyId } },
    update: { status: "EVIDENCE_ATTACHED" },
    create: {
      controlId,
      companyId: session.companyId,
      status: "EVIDENCE_ATTACHED",
      ownerId: session.userId,
    },
  });

  return NextResponse.json({ ok: true, evidence });
}
