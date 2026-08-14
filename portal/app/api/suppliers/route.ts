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

export async function GET() {
  const { data, error } = await supabaseAdmin.from("suppliers").select(SELECT).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data?.map((s) => flatten(s as Record<string, unknown>)) ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { company_name, ...fields } = body;

  if (fields.company_id && !fields.name) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", fields.company_id).single();
    if (co) fields.name = co.name;
  }

  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .insert(fields)
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}
