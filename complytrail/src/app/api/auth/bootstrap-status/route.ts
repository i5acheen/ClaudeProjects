import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public (unauthenticated) endpoint the register page uses to decide whether
// to show "create your workspace" or "join the existing workspace" copy.
export async function GET() {
  const company = await prisma.company.findFirst();
  return NextResponse.json({ hasCompany: !!company, companyName: company?.name ?? null });
}
