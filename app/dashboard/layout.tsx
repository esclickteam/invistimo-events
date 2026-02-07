"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import DashboardHeader from "./DashboardHeader";
import DashboardMobileMenu from "./DashboardMobileMenu";

/* ============================================================
   Types
============================================================ */
type Invitation = {
  _id: string;
  shareId: string;
  title?: string;
};

/* ============================================================
   Layout
============================================================ */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 🧪 דמו = כל מה שמתחיל ב־/try
  const isDemo = pathname.startsWith("/try");

  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  /* ============================================================
     Load Invitation (לא בדמו)
  ============================================================ */
  useEffect(() => {
    if (isDemo) {
      // ⭐️ בדמו – הזמנה פיקטיבית בלבד
      setInvitation({
        _id: "demo",
        shareId: "demo",
        title: "אירוע לדוגמה",
      });
      setLoadingInvitation(false);
      return;
    }

    async function loadInvitation() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (data?.success && data.invitation) {
          setInvitation(data.invitation);
        }
      } catch (err) {
        console.error("❌ Failed to load invitation for dashboard", err);
      } finally {
        setLoadingInvitation(false);
      }
    }

    loadInvitation();
  }, [isDemo]);

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* =========================
          Header – קבוע למעלה
      ========================= */}
      <DashboardHeader
        onOpenMenu={() => setMenuOpen(true)}
        invitation={invitation}
        isDemo={isDemo}
      />

      {/* =========================
          Mobile Menu
      ========================= */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationShareId={invitation?.shareId}
        isDemo={isDemo}
      />

      {/* =========================
          Content
      ========================= */}
      <main className="pt-16">

        {/* אפשר להוסיף skeleton אם רוצים */}
        {!loadingInvitation && children}
      </main>
    </div>
  );
}
