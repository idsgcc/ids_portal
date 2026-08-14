import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, company_id, name, companies(name, billing_country), contact_name, email, phone, category, status, lead_time_days, payment_terms, website, notes, created_at";

type CompanyJoin = { name: string; billing_country: string | null } | null;

function flatten(s: Record<string, unknown>) {
  const { companies, ...rest } = s;
  const co = companies as CompanyJoin;
  return {
    ...rest,
    company_name: co?.name ?? (rest.name as string | null) ?? null,
    company_country: co?.billing_country ?? null,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("suppliers").select(SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { company_name, ...fields } = body;

  if (fields.company_id) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", fields.company_id).single();
    if (co) fields.name = co.name;
  }

  const { error } = await supabaseAdmin.from("suppliers").update(fields).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("suppliers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
