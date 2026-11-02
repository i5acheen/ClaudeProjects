"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { browserDb } from "@/lib/db/browser";

/** Supabase Realtime → refresh server components when watched tables change (RLS applies to the feed). */
export function RealtimeRefresh({
  tables,
  channel,
}: {
  tables: ("leads" | "messages" | "conversations" | "notifications")[];
  channel: string;
}) {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return; // prototype: no database to listen to
    const db = browserDb();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ch = db.channel(channel);
    for (const table of tables) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300);
      });
    }
    ch.subscribe();
    return () => {
      clearTimeout(timer);
      void db.removeChannel(ch);
    };
  }, [router, channel, tables]);
  return null;
}
