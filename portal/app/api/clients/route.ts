import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, company_id, name, companies(name, billing_country), status, notes, created_at, client_contacts(id, name, title, email, phone, sort_order)";

type ClientContact = { id: string; name: string | null; title: string | null; email: string | null; phone: string | null; sort_order: number };
type ContactInput = { name?: string; title?: string; email?: string; phone?: string };
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

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select(SELECT)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data?.map((c) => flatten(c as Record<string, unknown>)) ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { contacts, company_name, ...fields } = body;

  if (fields.company_id && !fields.name) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", fields.company_id).single();
    if (co) fields.name = co.name;
  }

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert(fields)
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const contactRows = buildContacts(data.id, contacts);
  if (contactRows.length) {
    await supabaseAdmin.from("client_contacts").insert(contactRows);
  }

  const { data: full, error: e2 } = await supabaseAdmin
    .from("clients")
    .select(SELECT)
    .eq("id", data.id)
    .single();
  if (e2) return NextResponse.json({ error: e2.message }, { status: 502 });
  return NextResponse.json(flatten(full as Record<string, unknown>));
}

function buildContacts(clientId: string, contacts: ContactInput[] | undefined) {
  if (!contacts?.length) return [];
  return contacts
    .filter((c) => c.name || c.email || c.phone)
    .map((c, i) => ({
      client_id: clientId,
      name: c.name || null,
      title: c.title || null,
      email: c.email || null,
      phone: c.phone || null,
      sort_order: i,
    }));
}
