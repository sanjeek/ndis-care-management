import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const leaveTypes = ["annual_leave", "sick_leave", "unavailable"];
const leaveStatuses = ["pending", "approved", "rejected", "cancelled"];

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const workerEmail = String(body.worker_email || auth.user.email).trim().toLowerCase();
  const workerName = String(body.worker_name || auth.user.name || workerEmail).trim();
  const leaveType = normalizeLeaveType(body.leave_type);
  const startsAt = String(body.starts_at ?? "").trim();
  const endsAt = String(body.ends_at ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const requestedStatus = normalizeStatus(body.status);
  const isReviewer = requireRole(auth.user, ["admin", "team_leader"]);
  const status = isReviewer && leaveStatuses.includes(requestedStatus) ? requestedStatus : "pending";

  if (!workerEmail || !workerName || !leaveType || !startsAt || !endsAt) {
    return NextResponse.json({ message: "Worker, leave type, start, and end time are required." }, { status: 400 });
  }
  if (!leaveTypes.includes(leaveType)) {
    return NextResponse.json({ message: "Leave type must be annual leave, sick leave, or unavailable." }, { status: 400 });
  }
  if (auth.user.role === "support_worker" && workerEmail !== auth.user.email.toLowerCase()) {
    return NextResponse.json({ message: "Support workers can only submit leave for their own login." }, { status: 403 });
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return NextResponse.json({ message: "Leave end time must be after the start time." }, { status: 400 });
  }

  const { data: leave, error } = await auth.client
    .from("worker_leave_requests")
    .insert({
      worker_user_id: auth.user.role === "support_worker" ? auth.user.id : null,
      worker_name: workerName,
      worker_email: workerEmail,
      leave_type: leaveType,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      reason,
      status,
      reviewed_by: status === "pending" ? null : auth.user.id,
      reviewed_by_email: status === "pending" ? null : auth.user.email,
      reviewed_at: status === "pending" ? null : new Date().toISOString()
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: status === "pending" ? "leave_request_create" : "leave_request_create_approved",
    tableName: "worker_leave_requests",
    recordId: leave.id,
    recordLabel: `${workerName} ${friendlyLeaveType(leaveType)}`,
    metadata: { workerEmail, leaveType, startsAt, endsAt, status }
  });

  const admins = await getAdminNotificationRecipients(auth.client, { fallback: isReviewer ? [auth.user.email] : [] });
  await sendCareNotification(auth.client, {
    type: "worker_leave",
    to: admins,
    subject: `Leave request submitted: ${workerName}`,
    text: [
      `${workerName} submitted ${friendlyLeaveType(leaveType)}.`,
      `Email: ${workerEmail}`,
      `Start: ${startsAt}`,
      `End: ${endsAt}`,
      `Status: ${status}`,
      reason ? `Reason: ${reason}` : "",
      `Open roster: ${appUrl("/rostering")}`
    ].filter(Boolean).join("\n"),
    metadata: { leaveId: leave.id, workerEmail, leaveType, startsAt, endsAt, status }
  });

  return NextResponse.json({ message: status === "approved" ? "Leave saved and approved. Scheduling will be blocked for this period." : "Leave request submitted for approval.", id: leave.id });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin or team leader users can review leave." }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "").trim().toLowerCase();
  const reviewNotes = String(body.review_notes ?? "").trim();

  if (!id || !["approved", "rejected", "cancelled"].includes(status)) {
    return NextResponse.json({ message: "Select a leave request and review status." }, { status: 400 });
  }

  const { data: updated, error } = await auth.client
    .from("worker_leave_requests")
    .update({
      status,
      reviewed_by: auth.user.id,
      reviewed_by_email: auth.user.email,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, worker_name, worker_email, leave_type, starts_at, ends_at, status")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "leave_request_review",
    tableName: "worker_leave_requests",
    recordId: id,
    recordLabel: `${updated.worker_name} ${friendlyLeaveType(String(updated.leave_type))}`,
    metadata: { status, reviewNotes }
  });

  await sendCareNotification(auth.client, {
    type: "worker_leave",
    to: [String(updated.worker_email ?? "")],
    subject: `Leave request ${status}: ${friendlyLeaveType(String(updated.leave_type))}`,
    text: [
      `Your ${friendlyLeaveType(String(updated.leave_type))} request was ${status}.`,
      `Start: ${updated.starts_at}`,
      `End: ${updated.ends_at}`,
      reviewNotes ? `Review notes: ${reviewNotes}` : "",
      status === "approved" ? "Approved leave now blocks scheduling for this period." : ""
    ].filter(Boolean).join("\n"),
    metadata: { leaveId: id, status, reviewNotes }
  });

  return NextResponse.json({ message: status === "approved" ? "Leave approved. Scheduling is blocked for this period." : `Leave ${status}.` });
}

function friendlyLeaveType(value: string) {
  if (value === "annual_leave") return "annual leave";
  if (value === "sick_leave") return "sick leave";
  return "unavailable period";
}

function normalizeLeaveType(value: unknown) {
  const normalised = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalised === "annual" || normalised === "annual_leave") return "annual_leave";
  if (normalised === "sick" || normalised === "sick_leave") return "sick_leave";
  if (normalised === "unavailable_period" || normalised === "unavailable") return "unavailable";
  return normalised;
}

function normalizeStatus(value: unknown) {
  return String(value ?? "pending").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
