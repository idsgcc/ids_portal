import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const INV_SELECT = "id, invoice_number, party_type, contractor_id, supplier_id, supplier_name, purchase_order_id, amount, currency, status, invoice_date, due_date, paid_date, notes, created_at, contractor:contractors!contractor_id(id,name), supplier:suppliers!supplier_id(id,name)";

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
  const { party_type, contractor_id, supplier_id, invoice_number, purchase_order_id, amount, currency, status, invoice_date, due_date, paid_date, notes } = body;
  if (!invoice_number || !party_type) {
    return NextResponse.json({ error: "invoice_number and party_type required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      project_id: id,
      party_type: party_type || "supplier",
      contractor_id: contractor_id || null,
      supplier_id: supplier_id || null,
      supplier_name: null,
      invoice_number,
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
