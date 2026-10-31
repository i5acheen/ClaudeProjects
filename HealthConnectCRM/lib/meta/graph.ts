import { z } from "zod";
import { fetchWithTimeout } from "@/lib/utils";

export const graphLeadSchema = z.object({
  id: z.string(),
  created_time: z.string(),
  ad_id: z.string().optional(),
  adset_id: z.string().optional(),
  campaign_id: z.string().optional(),
  ad_name: z.string().optional(),
  campaign_name: z.string().optional(),
  form_id: z.string().optional(),
  platform: z.string().optional(),
  field_data: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  custom_disclaimer_responses: z.array(z.object({ checkbox_key: z.string(), is_checked: z.union([z.string(), z.boolean()]) })).optional(),
});
export type GraphLead = z.infer<typeof graphLeadSchema>;

const LEAD_FIELDS =
  "id,created_time,ad_id,adset_id,campaign_id,ad_name,campaign_name,form_id,platform,field_data,custom_disclaimer_responses";

export class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
  }
}

type GraphConfig = { version: string; accessToken: string; baseUrl?: string };

async function graphGet(cfg: GraphConfig, path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${cfg.baseUrl ?? "https://graph.facebook.com"}/${cfg.version}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetchWithTimeout(url.toString(), { headers: { Authorization: `Bearer ${cfg.accessToken}` } }, 10_000);
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = z.object({ error: z.object({ message: z.string(), code: z.number().optional() }) }).safeParse(json);
    throw new GraphError(
      err.success ? err.data.error.message : `Graph ${res.status}`,
      res.status,
      err.success ? err.data.error.code : undefined,
    );
  }
  return json;
}

export async function fetchLead(cfg: GraphConfig, leadgenId: string): Promise<GraphLead> {
  return graphLeadSchema.parse(await graphGet(cfg, encodeURIComponent(leadgenId), { fields: LEAD_FIELDS }));
}

/** Leads for a form created after `sinceUnix` (backfill). Follows paging up to `maxPages`. */
export async function fetchFormLeadsSince(cfg: GraphConfig, formId: string, sinceUnix: number, maxPages = 5): Promise<GraphLead[]> {
  const pageSchema = z.object({
    data: z.array(graphLeadSchema),
    paging: z.object({ cursors: z.object({ after: z.string() }).optional(), next: z.string().optional() }).optional(),
  });
  const filtering = JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceUnix }]);
  const out: GraphLead[] = [];
  let after: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const params: Record<string, string> = { fields: LEAD_FIELDS, filtering, limit: "100" };
    if (after) params.after = after;
    const page = pageSchema.parse(await graphGet(cfg, `${encodeURIComponent(formId)}/leads`, params));
    out.push(...page.data);
    if (!page.paging?.next || !page.paging.cursors?.after) break;
    after = page.paging.cursors.after;
  }
  return out;
}

export async function fetchPageForms(cfg: GraphConfig, pageId: string): Promise<{ id: string; name: string; status?: string }[]> {
  const schema = z.object({ data: z.array(z.object({ id: z.string(), name: z.string(), status: z.string().optional() })) });
  return schema.parse(await graphGet(cfg, `${encodeURIComponent(pageId)}/leadgen_forms`, { fields: "id,name,status", limit: "100" })).data;
}
