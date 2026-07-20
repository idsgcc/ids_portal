import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const INV_SELECT = "id, invoice_number, supplier_name, purchase_order_id, amount, currency, status, invoice_date, due_date, paid_date, notes, created_at";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select(INV_SELECT)
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { invoice_number, supplier_name, purchase_order_id, amount, currency, status, invoice_date, due_date, paid_date, notes } = body;
  if (!invoice_number || !supplier_name) {
    return NextResponse.json({ error: "invoice_number and supplier_name required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      project_id: id,
      invoice_number,
      supplier_name,
      purchase_order_id: purchase_order_id || null,
      amount: amount != null && amount !== "" ? Number(amount) : null,
      currency: currency || "USD",
      status: status || "pending",
      invoice_date: invoice_date || null,
      due_date: due_date || null,
      paid_date: paid_date || null,
      notes: notes || null,
    })
    .select(INV_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
