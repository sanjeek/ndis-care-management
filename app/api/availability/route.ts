import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const availabilityStatuses = ["available", "preferred", "unavailable"];

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const workerEmail = String(body.worker_email || auth.user.email).trim().toLowerCase();
  const workerName = String(body.worker_name || auth.user.name || workerEmail).trim();
  const availableDate = String(body.available_date ?? "").trim();
  const startTime = String(body.start_time ?? "").trim();
  const endTime = String(body.end_time ?? "").trim();
  const status = String(body.availability_status ?? "available").trim().toLowerCase();
  const notes = String(body.notes ?? "").trim();

  if (!availableDate || !startTime || !endTime) {
    return NextResponse.json({ message: "Date, start time, and end time are required." }, { status: 400 });
  }
  if (!availabilityStatuses.includes(status)) {
    return NextResponse.json({ message: "Availability status must be available, preferred, or unavailable." }, { status: 400 });
  }
  if (auth.user.role === "support_worker" && workerEmail !== auth.user.email.toLowerCase()) {
    return NextResponse.json({ message: "Support workers can only submit availability for their own login." }, { status: 403 });
  }

  const { data: availability, error } = await auth.client
    .from("worker_availability")
    .insert({
      worker_user_id: auth.user.id,
      worker_name: workerName,
      worker_email: workerEmail,
      available_date: availableDate,
      start_time: startTime,
      end_time: endTime,
      availability_status: status,
      notes
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
    action: "availability_update",
    tableName: "worker_availability",
    recordId: availability.id,
    recordLabel: `${workerName} ${availableDate}`,
    metadata: { workerEmail, availableDate, startTime, endTime, status }
  });

  const admins = await getAdminNotificationRecipients(auth.client);
  await sendCareNotification(auth.client, {
    type: "worker_availability",
    to: admins,
    subject: `Worker availability submitted: ${workerName}`,
    text: [
      `${workerName} submitted availability.`,
      `Email: ${workerEmail}`,
      `Date: ${availableDate}`,
      `Time: ${startTime} - ${endTime}`,
      `Status: ${status}`,
      `Open roster: ${appUrl("/rostering")}`
    ].join("\n"),
    metadata: { availabilityId: availability.id, workerEmail, availableDate, startTime, endTime, status }
  });

  return NextResponse.json({ message: "Availability submitted.", id: availability.id });
}
