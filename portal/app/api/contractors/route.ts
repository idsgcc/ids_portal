import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, name, country, principal, specialization, status, website, trade_license, notes, created_at, contractor_contacts(id, name, title, email, phone, sort_order)";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("contractors")
    .select(SELECT)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  const sorted = data?.map((c) => ({
    ...c,
    contractor_contacts: (c.contractor_contacts as ContractorContact[])
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
  return NextResponse.json(sorted);
}

type ContractorContact = { id: string; name: string | null; title: string | null; email: string | null; phone: string | null; sort_order: number };
type ContactInput = { id?: string; name?: string; title?: string; email?: string; phone?: string };

export async function POST(req: Request) {
  const body = await req.json();
  const { contacts, contact_name, email, phone, ...fields } = body;

  const { data, error } = await supabaseAdmin
    .from("contractors")
    .insert(fields)
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const contactRows = buildContacts(data.id, contacts);
  if (contactRows.length) {
    await supabaseAdmin.from("contractor_contacts").insert(contactRows);
  }

  const { data: full, error: e2 } = await supabaseAdmin
    .from("contractors")
    .select(SELECT)
    .eq("id", data.id)
    .single();
  if (e2) return NextResponse.json({ error: e2.message }, { status: 502 });
  return NextResponse.json(full);
}

function buildContacts(contractorId: string, contacts: ContactInput[] | undefined) {
  if (!contacts?.length) return [];
  return contacts
    .filter((c) => c.name || c.email || c.phone)
    .map((c, i) => ({
      contractor_id: contractorId,
      name: c.name || null,
      title: c.title || null,
      email: c.email || null,
      phone: c.phone || null,
      sort_order: i,
    }));
}
