import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [
    { data: projects },
    { data: invoices },
    { data: opportunities },
  ] = await Promise.all([
    supabaseAdmin.from("projects").select("status"),
    supabaseAdmin.from("invoices").select("party_type, amount, currency, status, due_date, paid_date"),
    supabaseAdmin.from("opportunities").select("status, created_at"),
  ]);

  // Projects by status
  const projectCounts: Record<string, number> = {};
  for (const p of projects ?? []) {
    projectCounts[p.status] = (projectCounts[p.status] ?? 0) + 1;
  }

  // Invoices: outstanding (client only, unpaid) and overdue
  const clientInvoices = (invoices ?? []).filter(i => i.party_type === "client");
  const outstanding = clientInvoices.filter(i => i.status !== "paid");
  const overdue = outstanding.filter(i => i.due_date && i.due_date < today);

  function sumByCurrency(rows: typeof outstanding) {
    const acc: Record<string, number> = {};
    for (const r of rows) acc[r.currency] = (acc[r.currency] ?? 0) + (r.amount ?? 0);
    return acc;
  }

  // Opportunities
  const oppCounts: Record<string, number> = {};
  let awardedThisMonth = 0;
  for (const o of opportunities ?? []) {
    oppCounts[o.status] = (oppCounts[o.status] ?? 0) + 1;
    if (o.status === "awarded" && o.created_at >= monthStart) awardedThisMonth++;
  }
  const decided = (oppCounts.awarded ?? 0) + (oppCounts.lost ?? 0);
  const winRate = decided > 0 ? Math.round(((oppCounts.awarded ?? 0) / decided) * 100) : null;

  return NextResponse.json({
    projects: {
      counts: projectCounts,
      total: (projects ?? []).length,
    },
    finance: {
      outstanding: sumByCurrency(outstanding),
      outstanding_count: outstanding.length,
      overdue: sumByCurrency(overdue),
      overdue_count: overdue.length,
    },
    opportunities: {
      counts: oppCounts,
      awarded_this_month: awardedThisMonth,
      win_rate: winRate,
    },
  });
}
