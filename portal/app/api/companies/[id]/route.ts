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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("companies").select(SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, phone, website, billing_street, billing_city, billing_country, billing_zip } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update({
      name: name.trim(),
      phone: phone || null,
      website: website || null,
      billing_street: billing_street || null,
      billing_city: billing_city || null,
      billing_country: billing_country || null,
      billing_zip: billing_zip || null,
    })
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("companies").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return new NextResponse(null, { status: 204 });
}
