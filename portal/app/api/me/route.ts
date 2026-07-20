import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ id: user.id, full_name: profile?.full_name ?? "", role: profile?.role ?? "engineer" });
}
