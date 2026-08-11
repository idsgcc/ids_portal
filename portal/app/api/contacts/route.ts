import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const PAGE = 1000;
  const all: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("id, name, company_name, title, phone, mobile, email")
      .order("name")
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, company_name, title, phone, mobile, email } = body;
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert({ name: name || null, company_name: company_name || null, title: title || null, phone: phone || null, mobile: mobile || null, email: email || null })
    .select("id, name, company_name, title, phone, mobile, email")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data, { status: 201 });
}
