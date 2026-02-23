"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Replace with a real job UUID from your dashboard to test with your data.
const TEST_JOB_ID = "00000000-0000-0000-0000-000000000000";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"] as const;
type Stage = (typeof STAGES)[number];

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

function KanbanColumn({
  stage,
  candidates,
}: {
  stage: Stage;
  candidates: Candidate[];
}) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] w-44 flex-shrink-0 flex-col rounded-lg border-2 bg-zinc-100/80 p-2 dark:bg-zinc-800/80 ${
        isOverDroppable
          ? "border-zinc-400 dark:border-zinc-500"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {stage}
      </h3>
      <div className="flex flex-1 flex-col gap-2">
        {candidates.map((c) => (
          <DraggableCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-900 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        {candidate.name}
      </p>
      {candidate.linkedin_url ? (
        <a
          href={candidate.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn
        </a>
      ) : null}
    </div>
  );
}

function DragOverlayCard({ candidate }: { candidate: Candidate }) {
  return (
    <div className="w-40 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        {candidate.name}
      </p>
      {candidate.linkedin_url ? (
        <span className="mt-1 block truncate text-xs text-blue-600 dark:text-blue-400">
          LinkedIn
        </span>
      ) : null}
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const jobId = TEST_JOB_ID;

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newLinkedIn, setNewLinkedIn] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

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
    init();
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
      .insert({
        job_id: jobId,
        name,
        linkedin_url,
        stage: "Applied",
      })
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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCandidate(null);
    if (!over || active.id === over.id) return;

    const newStage = over.id as string;
    if (!isStage(newStage)) return;

    const candidate = candidates.find((c) => c.id === active.id);
    if (!candidate || candidate.stage === newStage) return;

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, stage: newStage } : c
      )
    );

    const { error: updateError } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", active.id);

    if (updateError) {
      setError(updateError.message);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === active.id ? { ...c, stage: candidate.stage } : c
        )
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const candidate = candidates.find((c) => c.id === event.active.id);
    if (candidate) setActiveCandidate(candidate);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  const candidatesByStage = STAGES.reduce(
    (acc, stage) => ({
      ...acc,
      [stage]: candidates.filter((c) => c.stage === stage),
    }),
    {} as Record<Stage, Candidate[]>
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Candidates
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {job ? job.title : "Test job — replace TEST_JOB_ID in code with a job UUID from your dashboard"}
        </p>

        <form
          onSubmit={handleCreateCandidate}
          className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex-1 min-w-[140px]">
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
          <div className="flex-1 min-w-[200px]">
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

        <div className="mt-6">
          {candidates.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No candidates yet. Add one above; they will appear in Applied.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    candidates={candidatesByStage[stage]}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeCandidate ? (
                  <DragOverlayCard candidate={activeCandidate} />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
