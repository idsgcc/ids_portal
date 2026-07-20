import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const PO_SELECT = "id, po_number, supplier_name, description, amount, currency, status, issued_date, notes, created_at";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .select(PO_SELECT)
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { po_number, supplier_name, description, amount, currency, status, issued_date, notes } = body;
  if (!po_number || !supplier_name) {
    return NextResponse.json({ error: "po_number and supplier_name required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .insert({
      project_id: id,
      po_number,
      supplier_name,
      description: description || null,
      amount: amount != null && amount !== "" ? Number(amount) : null,
      currency: currency || "USD",
      status: status || "draft",
      issued_date: issued_date || null,
      notes: notes || null,
    })
    .select(PO_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
