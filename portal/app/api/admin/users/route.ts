import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Merge in emails from auth.users via admin API
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
  const emailMap = Object.fromEntries(authUsers.map((u) => [u.id, u.email]));

  return NextResponse.json(
    (profiles ?? []).map((p) => ({ ...p, email: emailMap[p.id] ?? "" }))
  );
}

export async function POST(req: Request) {
  const { email, full_name, password, role } = await req.json();
  if (!email || !full_name || !password || !role) {
    return NextResponse.json({ error: "email, full_name, password, role required" }, { status: 400 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 502 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({ id: user.id, full_name, role });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    return NextResponse.json({ error: profileError.message }, { status: 502 });
  }

  return NextResponse.json({ id: user.id, email, full_name, role });
}
