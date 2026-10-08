"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users, RefreshCw } from "lucide-react";

type ManagedUser = {
  _id: string;
  name?: string;
  email?: string;
};

export default function AdminManageBanner() {
  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/manage-user", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.status === 403) {
          if (!cancelled) setManagedUser(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setManagedUser(
            data?.isManaging && data?.managedUser ? data.managedUser : null
          );
        }
      } catch {
        if (!cancelled) setManagedUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function exitManage() {
    try {
      setExiting(true);
      await fetch("/api/admin/manage-user", {
        method: "DELETE",
        credentials: "include",
      });
      window.location.href = "/admin/users";
    } catch {
      alert("שגיאה בחזרה לניהול משתמשים");
      setExiting(false);
    }
  }

  if (loading || !managedUser) return null;

  const displayName = managedUser.name || managedUser.email || "משתמש";

  return (
    <div
      dir="rtl"
      className="sticky top-0 z-[80] border-b border-[#D4B48A] bg-gradient-to-l from-[#2F2418] via-[#3D2E1F] to-[#2F2418] text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <ShieldCheck className="h-5 w-5 text-[#E8C98A]" />
          </div>
          <div>
            <p className="text-sm font-black tracking-wide text-[#E8C98A]">
              מצב ניהול אדמין
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white/90">
              מנהל את החשבון של: {displayName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin/users"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-black text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            החלפת משתמש
          </a>
          <button
            type="button"
            onClick={exitManage}
            disabled={exiting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#E8C98A] px-4 text-xs font-black text-[#2F2418] transition hover:bg-[#f0d6a8] disabled:opacity-60"
          >
            <Users className="h-3.5 w-3.5" />
            {exiting ? "יוצא..." : "חזרה לניהול משתמשים"}
          </button>
        </div>
      </div>
    </div>
  );
}
