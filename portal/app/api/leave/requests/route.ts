import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin
    .from("leave_requests")
    .select("*, employees(full_name, location)")
    .order("created_at", { ascending: false });
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .insert(body)
    .select("*, employees(full_name, location)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Send email notification (fire-and-forget, but log failures)
  sendLeaveRequestEmail(data).catch((err) => console.error("[leave-request] email failed:", err));

  return NextResponse.json(data);
}

async function sendLeaveRequestEmail(req: {
  employee_id: string;
  leave_type: string;
  date_out: string;
  date_in: string;
  days: number;
  detail: string | null;
  coverage: string | null;
  employees: { full_name: string } | null;
}) {
  const to = process.env.RESEND_TO;
  if (!to) {
    console.error("[leave-request] RESEND_TO env var not set — skipping email");
    return;
  }

  const employeeName = req.employees?.full_name ?? "An employee";
  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ids-portal-gold.vercel.app"}/leave/requests`;

  const { data: sent, error: emailErr } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to,
    subject: `Leave Request — ${employeeName} · ${req.leave_type} · ${fmtDate(req.date_out)}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="margin-bottom:4px">New Leave Request</h2>
        <p style="color:#666;margin-top:0;margin-bottom:20px">A leave request has been submitted and is pending your approval.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px"/>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888;width:130px;vertical-align:top">Employee</td><td style="padding:6px 0;font-weight:600">${employeeName}</td></tr>
          <tr><td style="padding:6px 0;color:#888;vertical-align:top">Leave Type</td><td style="padding:6px 0">${req.leave_type}</td></tr>
          <tr><td style="padding:6px 0;color:#888;vertical-align:top">First Day</td><td style="padding:6px 0">${fmtDate(req.date_out)}</td></tr>
          <tr><td style="padding:6px 0;color:#888;vertical-align:top">Last Day</td><td style="padding:6px 0">${fmtDate(req.date_in)}</td></tr>
          <tr><td style="padding:6px 0;color:#888;vertical-align:top">Duration</td><td style="padding:6px 0;font-weight:600">${req.days} day${req.days !== 1 ? "s" : ""}</td></tr>
          ${req.detail ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top">Reason</td><td style="padding:6px 0">${req.detail}</td></tr>` : ""}
          ${req.coverage ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top">Coverage</td><td style="padding:6px 0">${req.coverage}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Review Request →</a>
      </div>
    `,
  });

  if (emailErr) {
    console.error("[leave-request] Resend error:", emailErr);
  } else {
    console.log("[leave-request] Email sent, id:", sent?.id);
  }
}
