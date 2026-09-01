import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "superuser"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [invoicesRes, posRes, ratesRes] = await Promise.all([
    supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, amount, currency, status, party_type, invoice_date, paid_date, project:projects(id, name)")
      .order("invoice_date", { ascending: false }),
    supabaseAdmin
      .from("purchase_orders")
      .select("id, po_number, amount, currency, status, party_type, issued_date, project:projects(id, name)")
      .order("issued_date", { ascending: false }),
    supabaseAdmin.from("currency_rates").select("currency, rate_to_aed"),
  ]);

  if (invoicesRes.error) return NextResponse.json({ error: invoicesRes.error.message }, { status: 502 });
  if (posRes.error) return NextResponse.json({ error: posRes.error.message }, { status: 502 });
  if (ratesRes.error) return NextResponse.json({ error: ratesRes.error.message }, { status: 502 });

  const rateMap: Record<string, number> = { AED: 1 };
  for (const r of ratesRes.data ?? []) {
    if (r.rate_to_aed > 0) rateMap[r.currency] = Number(r.rate_to_aed);
  }

  function toAed(amount: number | null, currency: string): number {
    if (!amount) return 0;
    return amount * (rateMap[currency] ?? 0);
  }

  const invoices = invoicesRes.data ?? [];
  const pos = posRes.data ?? [];

  const poReceived = pos.filter(p => p.party_type === "client" && ["approved", "closed"].includes(p.status));
  const invoicesIssued = invoices.filter(i => i.party_type === "client" && ["submitted", "paid"].includes(i.status));
  const poIssued = pos.filter(p => p.party_type === "supplier" && ["approved", "closed"].includes(p.status));
  const invoicesReceived = invoices.filter(i => i.party_type === "supplier" && ["submitted", "paid"].includes(i.status));

  return NextResponse.json({
    po_received_aed: poReceived.reduce((s, p) => s + toAed(p.amount, p.currency), 0),
    po_received_items: poReceived,
    invoices_issued_aed: invoicesIssued.reduce((s, i) => s + toAed(i.amount, i.currency), 0),
    invoices_issued_items: invoicesIssued,
    po_issued_aed: poIssued.reduce((s, p) => s + toAed(p.amount, p.currency), 0),
    po_issued_items: poIssued,
    invoices_received_aed: invoicesReceived.reduce((s, i) => s + toAed(i.amount, i.currency), 0),
    invoices_received_items: invoicesReceived,
    rates_populated: Object.keys(rateMap).length > 1,
  });
}
