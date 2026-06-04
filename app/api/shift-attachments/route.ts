import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const bucket = "shift-attachments";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  let shiftsQuery = auth.client
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, starts_at, ends_at")
    .order("starts_at", { ascending: false })
    .limit(150);
  let attachmentsQuery = auth.client.from("shift_attachments").select("*").order("created_at", { ascending: false }).limit(150);
  if (!canManage) {
    shiftsQuery = shiftsQuery.eq("support_worker_email", auth.user.email.toLowerCase());
    attachmentsQuery = attachmentsQuery.eq("support_worker_email", auth.user.email.toLowerCase());
  }
  const [shifts, attachments] = await Promise.all([shiftsQuery, attachmentsQuery]);
  if (shifts.error) return NextResponse.json({ message: shifts.error.message }, { status: 400 });
  if (attachments.error) return NextResponse.json({ message: attachments.error.message }, { status: 400 });
  return NextResponse.json({ canManage, shifts: shifts.data ?? [], attachments: attachments.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const form = await request.formData();
  const shiftId = String(form.get("shiftId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const attachmentType = String(form.get("attachmentType") ?? "general").trim();
  const file = form.get("file");
  if (!shiftId || !title || !(file instanceof File)) {
    return NextResponse.json({ message: "Shift, title, and file are required." }, { status: 400 });
  }

  const { data: shift, error: shiftError } = await auth.client
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email")
    .eq("id", shiftId)
    .maybeSingle();
  if (shiftError || !shift) return NextResponse.json({ message: shiftError?.message ?? "Shift not found." }, { status: 404 });

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const isAssigned = String(shift.support_worker_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!canManage && !isAssigned) {
    return NextResponse.json({ message: "You can only upload attachments for shifts assigned to your login." }, { status: 403 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${shiftId}/${crypto.randomUUID()}-${safeName}`;
  const upload = await auth.client.storage.from(bucket).upload(path, await file.arrayBuffer(), {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (upload.error) return NextResponse.json({ message: upload.error.message }, { status: 400 });

  const { data: attachment, error } = await auth.client
    .from("shift_attachments")
    .insert({
      shift_id: shiftId,
      participant_name: shift.participant_name,
      support_worker_name: shift.support_worker_name,
      support_worker_email: shift.support_worker_email,
      title,
      attachment_type: attachmentType,
      storage_bucket: bucket,
      storage_path: path,
      file_name: file.name,
      content_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: auth.user.id,
      uploaded_by_email: auth.user.email
    })
    .select("id")
    .single();
  if (error) {
    await auth.client.storage.from(bucket).remove([path]);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "shift_attachment_upload",
    tableName: "shift_attachments",
    recordId: attachment.id,
    recordLabel: title,
    metadata: { shiftId, participantName: shift.participant_name, fileName: file.name, secureStorage: true }
  });

  const recipients = canManage ? [String(shift.support_worker_email ?? "")] : await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await notifyCareEvent(auth.client, {
    type: "document_upload",
    to: recipients,
    title: "Shift attachment uploaded",
    body: `${title} was uploaded for ${shift.participant_name}.`,
    linkUrl: "/shift-attachments",
    subject: `Shift attachment uploaded: ${title}`,
    text: `A secure shift attachment was uploaded for ${shift.participant_name}.`,
    metadata: { attachmentId: attachment.id, shiftId, participantName: shift.participant_name }
  });

  return NextResponse.json({ message: "Shift attachment uploaded securely.", id: attachment.id });
}
