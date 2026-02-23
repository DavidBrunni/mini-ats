"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  organization_id: string;
};

type Job = {
  id: string;
  organization_id: string;
  title: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError || !profile?.organization_id) {
        setError(profileError?.message ?? "No organization found for your profile.");
        setLoading(false);
        return;
      }

      setOrganizationId(profile.organization_id);
      await fetchJobs(profile.organization_id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function fetchJobs(orgId: string) {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("jobs")
      .select("id, organization_id, title, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setJobs([]);
      return;
    }
    setJobs(data ?? []);
  }

  async function handleCreateJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = newJobTitle.trim();
    if (!title || !organizationId) return;

    setCreating(true);
    setError(null);

    const { data: inserted, error: insertError } = await supabase
      .from("jobs")
      .insert({ organization_id: organizationId, title })
      .select("id, organization_id, title, created_at")
      .single();

    setCreating(false);
    setNewJobTitle("");

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (inserted) {
      setJobs((prev) => [inserted, ...prev]);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Jobs in your organization
        </p>

        <form
          onSubmit={handleCreateJob}
          className="mt-6 flex gap-2"
        >
          <input
            type="text"
            value={newJobTitle}
            onChange={(e) => setNewJobTitle(e.target.value)}
            placeholder="New job title"
            disabled={creating || !organizationId}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={creating || !newJobTitle.trim() || !organizationId}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {creating ? "Adding…" : "Add job"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <ul className="mt-6 list-none space-y-2 p-0">
          {jobs.length === 0 && !error && (
            <li className="rounded-md border border-zinc-200 bg-white py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No jobs yet. Add one above.
            </li>
          )}
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {job.title}
                </span>
                <Link
                  href="/dashboard/candidates"
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  Kandidater →
                </Link>
              </div>
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(job.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
