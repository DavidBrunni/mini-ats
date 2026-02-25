"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Navbar } from "@/app/components/Navbar";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"] as const;
type Stage = (typeof STAGES)[number];

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        cur += ch;
      }
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

type Candidate = {
  id: string;
  job_id: string;
  name: string;
  linkedin_url: string | null;
  stage: Stage;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
};

function isStage(s: string): s is Stage {
  return STAGES.includes(s as Stage);
}

const STAGE_BADGE_CLASSES: Record<Stage, string> = {
  Applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  Screening: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  Interview: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  Offer: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  Hired: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
};

function StatusBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STAGE_BADGE_CLASSES[stage]}`}
    >
      {stage}
    </span>
  );
}

function KanbanColumn({
  stage,
  candidates,
  jobTitle,
  onOpenDetail,
}: {
  stage: Stage;
  candidates: Candidate[];
  jobTitle: string;
  onOpenDetail: (c: Candidate) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[80px] w-52 flex-shrink-0 flex-col rounded-md border bg-zinc-100/90 px-1.5 py-1.5 dark:bg-zinc-800/90 ${
        isOver ? "border-zinc-400 dark:border-zinc-500" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <h3 className="mb-1.5 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {stage}
      </h3>
      <div className="kanban-scroll-y flex min-h-[3rem] flex-1 flex-col gap-1.5 overflow-y-auto">
        {candidates.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            —
          </p>
        ) : (
          candidates.map((c) => (
            <DraggableCard
              key={c.id}
              candidate={c}
              jobTitle={jobTitle}
              onOpenDetail={onOpenDetail}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  candidate,
  jobTitle,
  onOpenDetail,
}: {
  candidate: Candidate;
  jobTitle: string;
  onOpenDetail: (c: Candidate) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-zinc-200 bg-white shadow-md transition-shadow hover:shadow-lg dark:border-zinc-600 dark:bg-zinc-900 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div {...listeners} {...attributes} className="cursor-grab p-3 active:cursor-grabbing">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {candidate.name}
        </p>
        <div className="mt-1.5">
          <StatusBadge stage={candidate.stage} />
        </div>
        {jobTitle ? (
          <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {jobTitle}
          </p>
        ) : null}
        {candidate.linkedin_url ? (
          <a
            href={candidate.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkedInIcon />
            LinkedIn
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail(candidate);
        }}
        className="w-full rounded-b-xl border-t border-zinc-100 px-3 py-1.5 text-left text-[11px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        aria-label="Comments and activity"
      >
        Comments & activity
      </button>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function DragOverlayCard({
  candidate,
  jobTitle,
}: {
  candidate: Candidate;
  jobTitle: string;
}) {
  return (
    <div className="w-52 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {candidate.name}
      </p>
      <div className="mt-1.5">
        <StatusBadge stage={candidate.stage} />
      </div>
      {jobTitle ? (
        <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {jobTitle}
        </p>
      ) : null}
      {candidate.linkedin_url ? (
        <span className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
          <LinkedInIcon />
          LinkedIn
        </span>
      ) : null}
    </div>
  );
}

type CommentRow = {
  id: string;
  comment: string;
  created_at: string;
  user_id?: string;
};

type ActivityRow = {
  id: string;
  from_stage: string | null;
  to_stage: string;
  created_at: string;
  user_id?: string;
};

function CandidateDetailModal({
  candidate,
  jobTitle,
  onClose,
  onCommentAdded,
}: {
  candidate: Candidate;
  jobTitle: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidate?.id) return;

    let cancelled = false;
    setLoadError(null);

    async function load() {
      setLoading(true);
      const [commentsRes, activitiesRes] = await Promise.all([
        supabase
          .from("candidate_comments")
          .select("id, comment, created_at, user_id")
          .eq("candidate_id", candidate.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("candidate_activities")
          .select("id, from_stage, to_stage, created_at, user_id")
          .eq("candidate_id", candidate.id)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      const errs = [commentsRes.error?.message, activitiesRes.error?.message].filter(Boolean);
      if (errs.length) setLoadError(errs.join(". "));
      else setLoadError(null);
      if (commentsRes.data) setComments(commentsRes.data as CommentRow[]);
      if (activitiesRes.data) setActivities(activitiesRes.data as ActivityRow[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [candidate.id]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const body = newComment.trim();
    if (!body) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCommentError("Du måste vara inloggad för att lägga till kommentar.");
      return;
    }

    setCommentError(null);
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("candidate_comments")
      .insert({ candidate_id: candidate.id, user_id: user.id, comment: body })
      .select("id, comment, created_at, user_id")
      .single();

    setSubmitting(false);
    setNewComment("");

    if (error) {
      setCommentError(error.message || "Kunde inte spara kommentaren.");
      return;
    }
    if (inserted) {
      setComments((prev) => [...prev, inserted as CommentRow]);
      onCommentAdded?.();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-detail-title"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 id="candidate-detail-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {candidate.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        {jobTitle ? (
          <p className="border-b border-zinc-100 px-4 py-1 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {jobTitle}
          </p>
        ) : null}

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : (
            <>
              {loadError && (
                <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  {loadError} Kör SQL-migrationen i Supabase om tabellerna saknas (se supabase-comments-activity.sql).
                </p>
              )}
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Activity
                </h3>
                {activities.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No stage changes yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {activities.map((a) => (
                      <li key={a.id} className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">
                          {a.from_stage ?? "—"} → {a.to_stage}
                        </span>
                        <span className="ml-2 text-zinc-500 dark:text-zinc-500">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Comments
                </h3>
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No comments yet.</p>
                ) : (
                  <ul className="mb-3 space-y-2 text-sm">
                    {comments.map((c) => (
                      <li
                        key={c.id}
                        className="rounded border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-800/50"
                      >
                        <p className="text-zinc-900 dark:text-zinc-100">{c.comment}</p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(c.created_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {commentError && (
                  <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
                    {commentError}
                  </p>
                )}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      setCommentError(null);
                    }}
                    placeholder="Add a comment…"
                    disabled={submitting}
                    className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {submitting ? "…" : "Add"}
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobCandidatesPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newLinkedIn, setNewLinkedIn] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [importing, setImporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!jobId) return;

    async function fetchJobAndCandidates() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setUserRole(profile?.role ?? "customer");

      setLoading(true);
      setError(null);

      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("id", jobId)
        .maybeSingle();
      setJob(jobData ?? null);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, job_id, name, linkedin_url, stage, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (candidatesError) {
        setError(candidatesError.message);
        setCandidates([]);
      } else {
        setError(null);
        setCandidates((candidatesData ?? []) as Candidate[]);
      }
      setLoading(false);
    }
    fetchJobAndCandidates();
  }, [jobId, router]);

  async function handleCreateCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !jobId) return;

    setCreating(true);
    setError(null);
    const linkedin_url = newLinkedIn.trim() || null;

    const { data: inserted, error: insertError } = await supabase
      .from("candidates")
      .insert({ job_id: jobId, name, linkedin_url, stage: "Applied" })
      .select("id, job_id, name, linkedin_url, stage, created_at")
      .single();

    setCreating(false);
    setNewName("");
    setNewLinkedIn("");

    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (inserted) {
      setCandidates((prev) => [...prev, inserted as Candidate]);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const c = candidates.find((x) => x.id === event.active.id);
    if (c) setActiveCandidate(c);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCandidate(null);
    if (!over || active.id === over.id) return;

    const newStage = over.id as string;
    if (!isStage(newStage)) return;

    const candidate = candidates.find((c) => c.id === active.id);
    if (!candidate || candidate.stage === newStage) return;

    setCandidates((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, stage: newStage } : c))
    );

    const { error: updateError } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", active.id);

    if (updateError) {
      setError(updateError.message);
      setCandidates((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, stage: candidate.stage } : c))
      );
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { error: activityError } = await supabase.from("candidate_activities").insert({
        candidate_id: active.id,
        user_id: currentUser.id,
        from_stage: candidate.stage,
        to_stage: newStage,
      });
      if (activityError) {
        setError(activityError.message);
      }
    }
  }

  function exportCandidatesToCsv(list: Candidate[], jobTitle: string) {
    const headers = ["name", "linkedin_url", "stage", "created_at"];
    const rows = list.map((c) => [
      escapeCsv(c.name),
      escapeCsv(c.linkedin_url ?? ""),
      escapeCsv(c.stage),
      escapeCsv(new Date(c.created_at).toISOString()),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${jobTitle.replace(/[^a-z0-9]/gi, "_")}_candidates.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(file: File) {
    if (!jobId) return;
    setImporting(true);
    setError(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      setError("CSV file is empty.");
      setImporting(false);
      return;
    }
    const firstRow = parseCsvLine(lines[0]);
    const headerRow = firstRow.map((h) => h.toLowerCase());
    const nameCol = headerRow.findIndex((h) => h === "name");
    const linkedInCol = headerRow.findIndex((h) => h === "linkedin_url" || h === "linkedin" || h === "url");
    const hasHeader = nameCol >= 0 || linkedInCol >= 0 || headerRow.some((h) => h.includes("name") || h.includes("linkedin"));
    const startRow = hasHeader ? 1 : 0;
    const nameIdx = nameCol >= 0 ? nameCol : 0;
    const toInsert: { name: string; linkedin_url: string | null }[] = [];
    for (let i = startRow; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      const name = (parts[nameIdx] ?? "").trim();
      if (!name) continue;
      const url = linkedInCol >= 0 ? (parts[linkedInCol] ?? "").trim() || null : null;
      toInsert.push({ name, linkedin_url: url });
    }
    let added = 0;
    for (const row of toInsert) {
      const { data, error: insertErr } = await supabase
        .from("candidates")
        .insert({ job_id: jobId, name: row.name, linkedin_url: row.linkedin_url, stage: "Applied" })
        .select("id, job_id, name, linkedin_url, stage, created_at")
        .single();
      if (!insertErr && data) {
        setCandidates((prev) => [...prev, data as Candidate]);
        added++;
      }
    }
    setImporting(false);
    if (added < toInsert.length && toInsert.length > 0) {
      setError(`Imported ${added} of ${toInsert.length} candidates. Some rows may have failed.`);
    }
  }

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredCandidates =
    searchLower === ""
      ? candidates
      : candidates.filter((c) => c.name.toLowerCase().includes(searchLower));

  const candidatesByStage = STAGES.reduce(
    (acc, stage) => ({
      ...acc,
      [stage]: filteredCandidates.filter((c) => c.stage === stage),
    }),
    {} as Record<Stage, Candidate[]>
  );

  if (!jobId) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
          ← Till startsidan
        </Link>
        <p className="mt-4 text-red-600 dark:text-red-400">Missing job ID.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar email={userEmail} role={userRole} />
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Tillbaka till dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Candidates
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {job ? job.title : "Job not found"}
        </p>

        <form
          onSubmit={handleCreateCandidate}
          className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Candidate name"
              disabled={creating}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={newLinkedIn}
              onChange={(e) => setNewLinkedIn(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              disabled={creating}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {creating ? "Adding…" : "Add candidate"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Search candidates
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name…"
              className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
              aria-label="Search candidates by name"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportCandidatesToCsv(candidates, job?.title ?? "candidates")}
              disabled={candidates.length === 0}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Export CSV
            </button>
            <label className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportCsv(file);
                  e.target.value = "";
                }}
              />
              {importing ? "Importing…" : "Import CSV"}
            </label>
          </div>
        </div>

        <div className="mt-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="kanban-scroll-x flex gap-2 overflow-x-auto pb-2">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  candidates={candidatesByStage[stage]}
                  jobTitle={job?.title ?? ""}
                  onOpenDetail={setDetailCandidate}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCandidate ? (
                <DragOverlayCard
                  candidate={activeCandidate}
                  jobTitle={job?.title ?? ""}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          {detailCandidate ? (
            <CandidateDetailModal
              candidate={detailCandidate}
              jobTitle={job?.title ?? ""}
              onClose={() => setDetailCandidate(null)}
            />
          ) : null}
          {candidates.length === 0 && (
            <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Add a candidate above — they will appear in Applied.
            </p>
          )}
          {candidates.length > 0 && filteredCandidates.length === 0 && (
            <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No candidates match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
