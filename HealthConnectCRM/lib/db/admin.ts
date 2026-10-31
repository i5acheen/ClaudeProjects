import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./types";

export type AdminDb = SupabaseClient<Database>;
let client: AdminDb | undefined;

/** Service-role client: bypasses RLS. Server code and Inngest jobs only — never in a request path that trusts client input for scoping. */
export function adminDb(): AdminDb {
  if (!client) {
    const env = serverEnv();
    client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
