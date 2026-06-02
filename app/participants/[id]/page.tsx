import { ParticipantProfilePage } from "@/components/module-pages";

export default async function ParticipantProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ParticipantProfilePage participantId={id} />;
}
