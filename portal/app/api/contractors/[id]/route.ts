import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, name, country, principal, specialization, status, website, trade_license, notes, created_at, contractor_contacts(id, name, title, email, phone, sort_order)";

type ContactInput = { id?: string; name?: string; title?: string; email?: string; phone?: string };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("contractors")
    .select(SELECT)
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  const result = {
    ...data,
    contractor_contacts: (data.contractor_contacts as ContractorContact[])
      .sort((a, b) => a.sort_order - b.sort_order),
  };
  return NextResponse.json(result);
}

type ContractorContact = { id: string; name: string | null; title: string | null; email: string | null; phone: string | null; sort_order: number };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { contacts, contact_name, email, phone, ...fields } = body;

  if (Object.keys(fields).length) {
    const { error } = await supabaseAdmin.from("contractors").update(fields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (contacts !== undefined) {
    await supabaseAdmin.from("contractor_contacts").delete().eq("contractor_id", id);
    const rows = (contacts as ContactInput[])
      .filter((c) => c.name || c.email || c.phone)
      .map((c, i) => ({
        contractor_id: id,
        name: c.name || null,
        title: c.title || null,
        email: c.email || null,
        phone: c.phone || null,
        sort_order: i,
      }));
    if (rows.length) {
      await supabaseAdmin.from("contractor_contacts").insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("contractors")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
