import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, name, company_name, title, phone, email")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, company_name, title, phone, email } = body;
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .update({ name: name || null, company_name: company_name || null, title: title || null, phone: phone || null, email: email || null })
    .eq("id", id)
    .select("id, name, company_name, title, phone, email")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return new NextResponse(null, { status: 204 });
}
