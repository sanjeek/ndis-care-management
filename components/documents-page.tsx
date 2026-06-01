"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, FileUp, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type CareDocument = {
  id: string;
  title: string;
  participant_name: string | null;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type ParticipantOption = {
  name: string;
};

export function DocumentsPage() {
  const [documents, setDocuments] = useState<CareDocument[]>([]);
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [message, setMessage] = useState("Loading secure documents.");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const [documentsResult, participantsResult] = await Promise.all([
      supabase.from("care_documents").select("id, title, participant_name, file_name, content_type, size_bytes, created_at").order("created_at", { ascending: false }),
      supabase.from("participants").select("name").order("name", { ascending: true })
    ]);

    if (documentsResult.error) {
      setMessage(documentsResult.error.message);
      return;
    }

    setDocuments(documentsResult.data ?? []);
    setParticipants(participantsResult.data ?? []);
    setMessage(documentsResult.data?.length ? "Documents are stored privately and require permission to view." : "No secure documents uploaded yet.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setMessage("Please sign in before uploading documents.");
      return;
    }

    setUploading(true);
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data
    });
    const result = await response.json();
    setUploading(false);
    setMessage(result.message ?? (response.ok ? "Document uploaded securely." : "Upload failed."));
    if (response.ok) {
      form.reset();
      await load();
    }
  }

  async function openDocument(documentId: string) {
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setMessage("Please sign in before opening documents.");
      return;
    }

    const response = await fetch(`/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (!response.ok || !result.url) {
      setMessage(result.message ?? "You do not have permission to access this document.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <AppShell title="Documents" eyebrow={message}>
      <section className="mb-6 rounded border border-gumleaf/25 bg-gumleaf/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-gumleaf" />
          <div>
            <h2 className="font-semibold text-ink">Private document storage</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Files are stored in a private Supabase bucket. The app creates a short-lived secure link only after checking the signed-in user&apos;s permission.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={uploadDocument} className="mb-6 rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Document title</span>
            <input name="title" required placeholder="Service agreement, care plan, compliance record" className="w-full rounded border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Participant</span>
            <select name="participantName" required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
              <option value="">Select participant</option>
              {participants.map((participant) => (
                <option key={participant.name} value={participant.name}>{participant.name}</option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">Secure file</span>
            <input name="file" type="file" required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded file:border-0 file:bg-gumleaf file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
          </label>
        </div>
        <button disabled={uploading || participants.length === 0} className="mt-4 inline-flex items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:opacity-60">
          <FileUp className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload securely"}
        </button>
      </form>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-ink">Secure document register</h2>
        </div>
        {documents.length ? (
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="min-w-[840px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-4 font-medium text-ink">{document.title}</td>
                    <td className="px-4 py-4 text-slate-700">{document.participant_name ?? "Not linked"}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <p>{document.file_name}</p>
                      <p className="text-xs text-slate-500">{document.content_type ?? "file"} {document.size_bytes ? `| ${formatBytes(document.size_bytes)}` : ""}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatDate(document.created_at)}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => openDocument(document.id)} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Download className="h-4 w-4" />
                        Secure view
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-sm text-slate-600">No secure documents have been uploaded yet.</div>
        )}
      </section>
    </AppShell>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
