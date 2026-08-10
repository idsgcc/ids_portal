import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

function fmtDate(s: string | null) {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id: projectId, taskId } = await params;

  // Fetch task + project
  const { data: task, error: taskErr } = await supabaseAdmin
    .from("project_tasks")
    .select(`
      id, name, phase, status, planned_finish, assigned_to_profile_id,
      project_plan:project_plans!project_plan_id(
        project:projects!project_id(id, name, client_name)
      )
    `)
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!task.assigned_to_profile_id) {
    return NextResponse.json({ error: "Task has no assignee" }, { status: 400 });
  }

  // Get assignee email from auth.users (same id as profiles)
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
    task.assigned_to_profile_id
  );

  if (userErr || !user?.email) {
    return NextResponse.json({ error: "Could not find assignee email" }, { status: 400 });
  }

  const project = (task.project_plan as { project: { id: string; name: string; client_name: string } } | null)?.project;
  const projectName = project?.name ?? "a project";
  const projectUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ids-portal-gold.vercel.app"}/projects/${projectId}`;
  const dueDate = fmtDate(task.planned_finish);

  // Send email
  const { error: emailErr } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: user.email,
    subject: `Reminder: ${task.name} — ${projectName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h2 style="margin-bottom:4px">Task Reminder</h2>
        <p style="color:#666;margin-top:0">${projectName}${project?.client_name ? ` · ${project.client_name}` : ""}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888;width:120px">Task</td><td style="padding:6px 0;font-weight:600">${task.name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Phase</td><td style="padding:6px 0">${task.phase}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Status</td><td style="padding:6px 0;text-transform:capitalize">${task.status.replace(/_/g, " ")}</td></tr>
          ${dueDate ? `<tr><td style="padding:6px 0;color:#888">Due</td><td style="padding:6px 0;color:#dc2626;font-weight:600">${dueDate}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <a href="${projectUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Project</a>
      </div>
    `,
  });

  if (emailErr) {
    return NextResponse.json({ error: emailErr.message }, { status: 502 });
  }

  // Log to reminders table
  await supabaseAdmin.from("reminders").insert({
    project_id: projectId,
    project_task_id: taskId,
    message: `Reminder sent for task: ${task.name}`,
  });

  return NextResponse.json({ ok: true });
}
