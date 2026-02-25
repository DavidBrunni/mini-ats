"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Navbar } from "./components/Navbar";

type Profile = { id: string; role?: string };

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser ?? null);
        if (!currentUser) {
          setLoading(false);
          return;
        }
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", currentUser.id)
          .maybeSingle();
        setProfile(profileData ?? null);
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  const loggedIn = !!user;
  const role = profile?.role ?? "customer";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {loggedIn && (
        <Navbar email={user.email ?? ""} role={role} />
      )}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <main className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Mini-ATS
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Track and manage candidates easily.
          </p>
          {!loggedIn && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/login"
                className="flex h-12 items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Login
              </Link>
              <Link
                href="/admin"
                className="flex h-12 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Admin
              </Link>
            </div>
          )}
          {loggedIn && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/dashboard"
                className="flex h-12 items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Dashboard
              </Link>
              {role === "admin" && (
                <Link
                  href="/admin"
                  className="flex h-12 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Admin
                </Link>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
