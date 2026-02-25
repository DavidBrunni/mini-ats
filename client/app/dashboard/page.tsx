"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "../components/Navbar";

type Profile = {
  id: string;
  organization_id: string;
  role?: string;
};

type Job = {
  id: string;
  organization_id: string;
  title: string;
  created_at: string;
};

type Organization = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("customer");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [adminSelectedOrgId, setAdminSelectedOrgId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (orgId: string, isAdmin: boolean, token: string | undefined) => {
      setError(null);
      if (isAdmin && token) {
        const res = await fetch(
          `/api/admin/jobs?organization_id=${encodeURIComponent(orgId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error ?? res.statusText);
          setJobs([]);
          return;
        }
        const data = await res.json();
        setJobs(data ?? []);
        return;
      }
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
    },
    []
  );

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, organization_id, role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError || !profile?.organization_id) {
        setError(profileError?.message ?? "No organization found for your profile.");
        setLoading(false);
        return;
      }

      const role = profile.role ?? "customer";
      setUserRole(role);
      setOrganizationId(profile.organization_id);

      if (role === "admin") {
        const orgRes = await fetch("/api/admin/organizations", {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (orgRes.ok) {
          const orgList = await orgRes.json();
          setOrganizations(orgList ?? []);
          const firstOrgId = orgList?.length ? orgList[0].id : profile.organization_id;
          setAdminSelectedOrgId(firstOrgId);
          await fetchJobs(firstOrgId, true, session?.access_token);
        } else {
          await fetchJobs(profile.organization_id, false, undefined);
        }
      } else {
        setAdminSelectedOrgId(null);
        await fetchJobs(profile.organization_id, false, undefined);
      }
      setLoading(false);
    }
    init();
  }, [router, fetchJobs]);

  useEffect(() => {
    if (userRole !== "admin" || !adminSelectedOrgId || !user) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchJobs(adminSelectedOrgId, true, session?.access_token);
    });
  }, [adminSelectedOrgId, userRole, user, fetchJobs]);

  async function handleCreateJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = newJobTitle.trim();
    const orgId = userRole === "admin" ? adminSelectedOrgId : organizationId;
    if (!title || !orgId) return;

    setCreating(true);
    setError(null);

    if (userRole === "admin") {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ organization_id: orgId, title }),
      });
      setCreating(false);
      setNewJobTitle("");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? res.statusText);
        return;
      }
      const inserted = await res.json();
      setJobs((prev) => [inserted, ...prev]);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("jobs")
      .insert({ organization_id: orgId, title })
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar email={user?.email ?? ""} role={userRole} />
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Startsida
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {userRole === "admin" ? "Select an organization to view and manage its jobs." : "Jobs in your organization"}
        </p>

        {userRole === "admin" && organizations.length > 0 && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Organization
            </label>
            <select
              value={adminSelectedOrgId ?? ""}
              onChange={(e) => setAdminSelectedOrgId(e.target.value || null)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <form
          onSubmit={handleCreateJob}
          className="mt-6 flex gap-2"
        >
          <input
            type="text"
            value={newJobTitle}
            onChange={(e) => setNewJobTitle(e.target.value)}
            placeholder="New job title"
            disabled={creating || !(userRole === "admin" ? adminSelectedOrgId : organizationId)}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={creating || !newJobTitle.trim() || !(userRole === "admin" ? adminSelectedOrgId : organizationId)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {creating ? "Adding…" : "Add job"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {jobs.length > 0 && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Filtrera jobb
            </label>
            <input
              type="search"
              value={jobSearchQuery}
              onChange={(e) => setJobSearchQuery(e.target.value)}
              placeholder="Sök på jobbtitel…"
              className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
              aria-label="Filtrera jobb på titel"
            />
          </div>
        )}

        <ul className="mt-6 list-none space-y-2 p-0">
          {jobs.length === 0 && !error && (
            <li className="rounded-md border border-zinc-200 bg-white py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No jobs yet. Add one above.
            </li>
          )}
          {(() => {
            const q = jobSearchQuery.trim().toLowerCase();
            const filtered = q
              ? jobs.filter((j) => j.title.toLowerCase().includes(q))
              : jobs;
            if (filtered.length === 0 && jobs.length > 0) {
              return (
                <li className="rounded-md border border-zinc-200 bg-white py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Inga jobb matchar sökningen.
                </li>
              );
            }
            return filtered.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}/candidates`}
                className="block rounded-md border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {job.title}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Kandidater →
                  </span>
                </div>
                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ));
          })()}
        </ul>
      </div>
    </div>
  );
}
