"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ShieldCheck, Users, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const BANNER_HEIGHT_VAR = "--admin-manage-banner-h";

function readManageCookieName() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )adminManageUserName=([^;]*)/);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function AdminManageBanner() {
  const { user, loading } = useAuth();
  const [legacyName, setLegacyName] = useState("");
  const [exiting, setExiting] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLegacyName(readManageCookieName());
  }, [user?._id, user?.role]);

  const sourceRole = String(user?.impersonationSourceRole || "");
  const actingAsCustomer = Boolean(
    user &&
      user.role !== "admin" &&
      (user.impersonatedByAdmin === true || sourceRole === "admin")
  );
  const legacyManage =
    !actingAsCustomer && user?.role === "admin" && Boolean(legacyName);
  const visible = !loading && (actingAsCustomer || legacyManage);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = bannerRef.current;
    if (!visible || !el) {
      root.style.removeProperty(BANNER_HEIGHT_VAR);
      delete root.dataset.adminManage;
      return;
    }

    const apply = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      root.style.setProperty(BANNER_HEIGHT_VAR, `${Math.max(height, 0)}px`);
    };

    apply();
    document.documentElement.dataset.adminManage = "1";
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty(BANNER_HEIGHT_VAR);
      delete root.dataset.adminManage;
    };
  }, [visible, legacyName, user?.name, user?.email]);

  if (!visible) return null;

  const displayName = actingAsCustomer
    ? user?.name || user?.email || "לקוח"
    : legacyName;

  async function exitToAdmin(path: string) {
    try {
      setExiting(true);
      sessionStorage.removeItem("auth_user");

      const role = String(user?.role || "");
      const impersonationRole = String(user?.impersonationRole || "");
      const nestedProducer =
        (role === "client" || role === "user") &&
        (impersonationRole === "producer" ||
          impersonationRole === "producer_staff" ||
          impersonationRole === "staff_producer");

      if (nestedProducer) {
        await fetch("/api/producer/stop-impersonation", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
        window.location.href = "/producer/dashboard";
        return;
      }

      if (actingAsCustomer) {
        await fetch("/api/admin/stop-impersonation", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      }

      if (legacyManage) {
        await fetch("/api/admin/manage-user", {
          method: "DELETE",
          credentials: "include",
        });
      }

      window.location.href = path;
    } catch {
      alert("שגיאה בחזרה לניהול משתמשים");
      setExiting(false);
    }
  }

  return (
    <div
      ref={bannerRef}
      dir="rtl"
      className="fixed inset-x-0 top-0 z-[10050] w-full border-b border-[#D4B48A] bg-gradient-to-l from-[#2F2418] via-[#3D2E1F] to-[#2F2418] text-white shadow-lg print:hidden"
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
          <button
            type="button"
            onClick={() => exitToAdmin("/admin/users")}
            disabled={exiting}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-black text-white transition hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            החלפת משתמש
          </button>
          <button
            type="button"
            onClick={() => exitToAdmin("/admin/users")}
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
