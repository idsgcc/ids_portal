import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SCRAPER_HEALTH_URL = "http://129.151.129.121:8080/health";
const FREE_TIER_BYTES = 500 * 1024 * 1024;

export async function GET() {
  const [statsResult, scraperRunsResult, scraperApiResult] = await Promise.allSettled([
    supabaseAdmin.rpc("get_diagnostics_stats"),
    supabaseAdmin
      .from("scraper_log")
      .select("id,run_time,tenders_found,new_tenders,status,notes,source,created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    (async () => {
      const t0 = Date.now();
      const res = await Promise.race([
        fetch(SCRAPER_HEALTH_URL, {
          headers: {
            Authorization: `Bearer ${process.env.SCRAPER_TOKEN}`,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000)
        ),
      ]);
      return {
        status: res.ok ? ("ok" as const) : ("error" as const),
        http_status: res.status,
        latency_ms: Date.now() - t0,
        body: await res.json().catch(() => ({})),
      };
    })(),
  ]);

  const stats =
    statsResult.status === "fulfilled" && statsResult.value.data
      ? (statsResult.value.data as { db_size_bytes: number; table_counts: Record<string, number> })
      : null;

  const scraperRuns =
    scraperRunsResult.status === "fulfilled" ? scraperRunsResult.value.data ?? [] : [];

  const scraperApi =
    scraperApiResult.status === "fulfilled"
      ? scraperApiResult.value
      : { status: "timeout" as const, http_status: null, latency_ms: null, body: {} };

  return NextResponse.json({
    db_size_bytes: stats?.db_size_bytes ?? null,
    free_tier_bytes: FREE_TIER_BYTES,
    table_counts: stats?.table_counts ?? {},
    scraper: {
      api_status: scraperApi.status,
      api_http_status: scraperApi.http_status,
      api_latency_ms: scraperApi.latency_ms,
      api_body: scraperApi.body,
      recent_runs: scraperRuns,
    },
    fetched_at: new Date().toISOString(),
  });
}
