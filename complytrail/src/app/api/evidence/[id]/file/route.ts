import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EVIDENCE_ROOT } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const evidence = await prisma.evidence.findUnique({ where: { id: params.id } });
  if (!evidence || evidence.companyId !== session.companyId || evidence.type !== "FILE") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const resolvedRoot = path.resolve(EVIDENCE_ROOT);
  const resolvedPath = path.resolve(EVIDENCE_ROOT, evidence.content);
  if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let data: Buffer;
  try {
    data = await fs.readFile(resolvedPath);
  } catch {
    return NextResponse.json({ error: "File is missing on disk." }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": evidence.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${(evidence.fileName ?? "evidence").replace(/"/g, "")}"`,
    },
  });
}
