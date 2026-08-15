import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await req.json();

  if (body.password) {
    if (body.password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: body.password });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (!body.role) return NextResponse.json({ error: "role or password required" }, { status: 400 });

  if (body.role === "superuser") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: callerProfile } = user
      ? await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single()
      : { data: null };
    if (callerProfile?.role !== "superuser") {
      return NextResponse.json({ error: "Only a Super User can assign the Super User role" }, { status: 403 });
    }
  }

  const { error } = await supabaseAdmin.from("profiles").update({ role: body.role }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
