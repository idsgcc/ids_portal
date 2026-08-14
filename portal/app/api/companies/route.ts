import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, name, phone, website, billing_street, billing_city, billing_country, billing_zip, contractors(id), suppliers(id), clients(id)";

function flatten(c: Record<string, unknown>) {
  const { contractors, suppliers, clients, ...rest } = c;
  return {
    ...rest,
    is_contractor: Array.isArray(contractors) && contractors.length > 0,
    is_supplier: Array.isArray(suppliers) && suppliers.length > 0,
    is_client: Array.isArray(clients) && clients.length > 0,
  };
}

export async function GET() {
  const PAGE = 1000;
  const all: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select(SELECT)
      .order("name")
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    all.push(...(data ?? []).map((c) => flatten(c as Record<string, unknown>)));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, phone, website, billing_street, billing_city, billing_country, billing_zip } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: name.trim(),
      phone: phone || null,
      website: website || null,
      billing_street: billing_street || null,
      billing_city: billing_city || null,
      billing_country: billing_country || null,
      billing_zip: billing_zip || null,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>), { status: 201 });
}
