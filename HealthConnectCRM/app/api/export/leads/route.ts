import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { loadPipeline } from "@/lib/leads-query";
import { maskPhone } from "@/lib/phone";
import { stageKey } from "@/lib/stages";

/** CSV export of the pipeline (masked phones). Audited (CLAUDE.md §10: every export). */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !["admin", "coordinator"].includes(s.profile.role)) return new NextResponse("forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const leads = await loadPipeline(
    {
      q: sp.get("q") ?? undefined,
      treatment: sp.get("treatment") ?? undefined,
      assigned: sp.get("assigned") ?? undefined,
      source: sp.get("source") ?? undefined,
    },
    s.userId,
  );
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // Leading =,+,-,@ would be treated as formulas by spreadsheet apps.
  const safe = (v: string) => esc(/^[=+\-@]/.test(v) ? `'${v}` : v);
  const rows = [["lead_id", "patient", "phone", "treatment", "stage", "source", "created_at"].join(",")].concat(
    leads.map((l) =>
      [l.id, l.patient.full_name, maskPhone(l.patient.phone_e164), l.treatment ?? "", stageKey(l.stage), l.source, l.created_at]
        .map(safe)
        .join(","),
    ),
  );
  await audit("leads.exported", "leads", null, undefined, { count: leads.length, filters: Object.fromEntries(sp) });
  return new NextResponse(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
