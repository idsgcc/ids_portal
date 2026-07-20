import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = ["invoice_number", "party_type", "contractor_id", "supplier_id", "supplier_name", "purchase_order_id", "amount", "currency", "status", "invoice_date", "due_date", "paid_date", "notes"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; invoiceId: string }> }) {
  const { invoiceId } = await params;
  const body = await req.json();
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update(update)
    .eq("id", invoiceId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; invoiceId: string }> }) {
  const { invoiceId } = await params;
  const { error } = await supabaseAdmin.from("invoices").delete().eq("id", invoiceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
