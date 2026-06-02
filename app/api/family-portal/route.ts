import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["family", "admin"])) {
    return NextResponse.json({ message: "Family portal access is required." }, { status: 403 });
  }

  const email = auth.user.email.toLowerCase();
  const familyQuery = auth.client
    .from("family_members")
    .select("participant_name, family_name, family_email, relationship, status")
    .eq("status", "approved");
  const familyLinks = auth.user.role === "admin" ? familyQuery : familyQuery.eq("family_email", email);
  const { data: links, error: linkError } = await familyLinks;

  if (linkError) {
    return NextResponse.json({ message: linkError.message }, { status: 400 });
  }

  const participantNames = Array.from(new Set((links ?? []).map((link) => String(link.participant_name ?? "")).filter(Boolean)));
  if (!participantNames.length) {
    return NextResponse.json({
      message: "No approved participant access has been assigned to this family account.",
      participants: [],
      schedules: [],
      progressNotes: [],
      goals: [],
      serviceUpdates: []
    });
  }

  const [participants, shifts, progressNotes, carePlans] = await Promise.all([
    auth.client
      .from("participants")
      .select("name, ndis_number, plan_type, goals, support_needs, communication_preferences")
      .in("name", participantNames),
    auth.client
      .from("shifts")
      .select("id, participant_name, location, starts_at, ends_at, status")
      .in("participant_name", participantNames)
      .order("starts_at", { ascending: true })
      .limit(100),
    auth.client
      .from("progress_notes")
      .select("id, participant_name, service_date, start_time, end_time, category, note, outcomes, is_important, created_at")
      .in("participant_name", participantNames)
      .order("service_date", { ascending: false })
      .limit(100),
    auth.client
      .from("care_plans")
      .select("id, participant_name, title, goals, support_instructions, participant_preferences, review_date, status")
      .in("participant_name", participantNames)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  for (const result of [participants, shifts, progressNotes, carePlans]) {
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "Family portal records loaded.",
    participants: (participants.data ?? []).map((participant) => ({
      name: participant.name,
      ndisNumber: participant.ndis_number,
      planType: participant.plan_type,
      goals: participant.goals,
      supportNeeds: participant.support_needs,
      communicationPreferences: participant.communication_preferences
    })),
    schedules: (shifts.data ?? []).map((shift) => ({
      id: shift.id,
      participantName: shift.participant_name,
      location: shift.location,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      status: shift.status
    })),
    progressNotes: (progressNotes.data ?? []).map((note) => ({
      id: note.id,
      participantName: note.participant_name,
      serviceDate: note.service_date,
      startTime: note.start_time,
      endTime: note.end_time,
      category: note.category,
      note: note.note,
      outcomes: note.outcomes,
      isImportant: Boolean(note.is_important),
      createdAt: note.created_at
    })),
    goals: (carePlans.data ?? []).map((plan) => ({
      id: plan.id,
      participantName: plan.participant_name,
      title: plan.title,
      goals: plan.goals,
      supportInstructions: plan.support_instructions,
      participantPreferences: plan.participant_preferences,
      reviewDate: plan.review_date,
      status: plan.status
    })),
    serviceUpdates: [
      ...(shifts.data ?? []).slice(0, 20).map((shift) => ({
        id: `shift-${shift.id}`,
        participantName: shift.participant_name,
        title: "Upcoming service",
        detail: `${shift.status || "Scheduled"} support at ${shift.location || "location not recorded"}`,
        date: shift.starts_at
      })),
      ...(progressNotes.data ?? []).slice(0, 20).map((note) => ({
        id: `note-${note.id}`,
        participantName: note.participant_name,
        title: note.category || "Progress note",
        detail: note.outcomes || note.note,
        date: note.created_at
      }))
    ].sort((a, b) => new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime()).slice(0, 20)
  });
}
