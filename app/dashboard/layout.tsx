"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  // 🧪 דמו = כל מה שמתחיל ב־/try
  const isDemo = pathname.startsWith("/try");

  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  /* ============================================================
     Load Invitation (לא בדמו)
     ✅ תומך גם ב-eventId (למפיקים / התחזות / כניסה מאירועים)
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
        const eventIdFromUrl = searchParams.get("eventId");

        const url = eventIdFromUrl
          ? `/api/invitations/by-event/${eventIdFromUrl}`
          : "/api/invitations/my";

        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (data?.success && data.invitation) {
          setInvitation(data.invitation);
        } else {
          setInvitation(null);
        }
      } catch (err) {
        console.error("❌ Failed to load invitation for dashboard", err);
        setInvitation(null);
      } finally {
        setLoadingInvitation(false);
      }
    }

    loadInvitation();
  }, [isDemo, searchParams]);

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
          ✅ הכי חשוב: להעביר invitationId כדי שיזהה "עריכת הזמנה"
      ========================= */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationId={invitation?._id}
        invitationShareId={invitation?.shareId}
        isDemo={isDemo}
      />

      {/* =========================
          Content
      ========================= */}
      <main className="pt-16">{!loadingInvitation && children}</main>
    </div>
  );
}