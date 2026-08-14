import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, company_id, name, companies(name, billing_country), status, notes, created_at, client_contacts(id, name, title, email, phone, sort_order)";

type ContactInput = { name?: string; title?: string; email?: string; phone?: string };
type ClientContact = { id: string; name: string | null; title: string | null; email: string | null; phone: string | null; sort_order: number };
type CompanyJoin = { name: string; billing_country: string | null } | null;

function flatten(c: Record<string, unknown>) {
  const { companies, client_contacts, ...rest } = c;
  const co = companies as CompanyJoin;
  return {
    ...rest,
    company_name: co?.name ?? (rest.name as string | null) ?? null,
    company_country: co?.billing_country ?? null,
    client_contacts: ((client_contacts ?? []) as ClientContact[]).sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("clients").select(SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { contacts, company_name, ...fields } = body;

  if (fields.company_id) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", fields.company_id).single();
    if (co) fields.name = co.name;
  }

  if (Object.keys(fields).length) {
    const { error } = await supabaseAdmin.from("clients").update(fields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (contacts !== undefined) {
    await supabaseAdmin.from("client_contacts").delete().eq("client_id", id);
    const rows = (contacts as ContactInput[])
      .filter((c) => c.name || c.email || c.phone)
      .map((c, i) => ({
        client_id: id,
        name: c.name || null,
        title: c.title || null,
        email: c.email || null,
        phone: c.phone || null,
        sort_order: i,
      }));
    if (rows.length) {
      await supabaseAdmin.from("client_contacts").insert(rows);
    }
  }

  const { data: full, error: e2 } = await supabaseAdmin.from("clients").select(SELECT).eq("id", id).single();
  if (e2) return NextResponse.json({ error: e2.message }, { status: 502 });
  return NextResponse.json(flatten(full as Record<string, unknown>));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
