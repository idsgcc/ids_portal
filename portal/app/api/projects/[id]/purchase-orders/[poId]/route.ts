import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = ["po_number", "party_type", "contractor_id", "supplier_id", "supplier_name", "description", "amount", "currency", "status", "issued_date", "notes"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; poId: string }> }) {
  const { poId } = await params;
  const body = await req.json();
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .update(update)
    .eq("id", poId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; poId: string }> }) {
  const { poId } = await params;
  const { error } = await supabaseAdmin.from("purchase_orders").delete().eq("id", poId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
