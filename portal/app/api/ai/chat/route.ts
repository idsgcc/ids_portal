import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  // Auth — superuser only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superuser") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { message, history } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  // Fetch live data from Supabase
  const [
    { data: projects },
    { data: opportunities },
    { data: invoices },
  ] = await Promise.all([
    supabaseAdmin
      .from("projects")
      .select(`
        id, name, status, priority, client_name, awarded_date, created_at,
        project_tasks(name, status, phase, planned_finish, notes)
      `)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("opportunities")
      .select(`
        name, status, close_date, notes,
        client:clients(name),
        contractor:contractors(name)
      `)
      .in("status", ["in_progress", "awarded"])
      .order("close_date", { ascending: false }),
    supabaseAdmin
      .from("invoices")
      .select(`
        invoice_number, party_type, amount, currency, status,
        invoice_date, due_date, paid_date,
        project:projects(name)
      `)
      .neq("status", "paid")
      .order("due_date", { ascending: true }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are an AI assistant for IDS-GCC, an operations and engineering company based in the Gulf region (Oman, UAE). You have access to live data from the IDS Operations Portal. Answer questions concisely and helpfully based on this data. Today's date is ${today}.

## PROJECTS (${(projects ?? []).length} total)
${(projects ?? []).map(p => {
  const tasks = (p.project_tasks ?? []);
  const activeTasks = tasks.filter((t: { status: string }) => t.status === "in_progress" || t.status === "not_started");
  return `- **${p.name}** | Status: ${p.status} | Priority: ${p.priority} | Client: ${p.client_name ?? "—"} | Awarded: ${p.awarded_date ?? "—"}
  Tasks (${tasks.length} total, ${activeTasks.length} active): ${activeTasks.slice(0, 3).map((t: { name: string; status: string; planned_finish: string | null }) => `${t.name} [${t.status}${t.planned_finish ? `, due ${t.planned_finish}` : ""}]`).join("; ") || "none active"}`;
}).join("\n")}

## OPEN OPPORTUNITIES (${(opportunities ?? []).length} in progress or awarded)
${(opportunities ?? []).map(o => {
  const client = (o.client as unknown as { name: string } | null)?.name ?? "—";
  return `- **${o.name}** | Status: ${o.status} | Client: ${client} | Close: ${o.close_date ?? "—"}`;
}).join("\n")}

## OUTSTANDING INVOICES (unpaid)
${(invoices ?? []).length === 0 ? "None" : (invoices ?? []).map(i => {
  const overdue = i.due_date && i.due_date < today ? " ⚠ OVERDUE" : "";
  return `- ${i.invoice_number} | ${i.party_type} | ${i.currency} ${i.amount?.toLocaleString()} | Status: ${i.status} | Due: ${i.due_date ?? "—"}${overdue} | Project: ${(i.project as unknown as { name: string } | null)?.name ?? "—"}`;
}).join("\n")}

Answer only from the data above. If something isn't in the data, say so clearly. Be concise.`;

  try {
    const chat = genAI.chats.create({
      model: "gemini-3.5-flash",
      config: { systemInstruction: systemPrompt },
      history: (history ?? []).map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    });

    const result = await chat.sendMessage({ message });
    return NextResponse.json({ reply: result.text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
