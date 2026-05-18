"use client";

import { useEffect, useMemo, useState } from "react";
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
  eventId?: string;
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

  const eventIdFromUrl = searchParams.get("eventId");
  const invitationIdFromUrl = searchParams.get("invitationId");

  const eventIdForMenu = useMemo(() => {
    if (isDemo) return "demo-event-001";

    return (
      eventIdFromUrl ||
      invitation?.eventId ||
      ""
    );
  }, [isDemo, eventIdFromUrl, invitation?.eventId]);

  /* ============================================================
     Load Invitation
     ✅ תומך:
     - invitationId
     - eventId (מפיקים)
     - fallback ל־my
  ============================================================ */
  useEffect(() => {
    if (isDemo) {
      setInvitation({
        _id: "demo",
        shareId: "demo",
        title: "אירוע לדוגמה",
        eventId: "demo-event-001",
      });
      setLoadingInvitation(false);
      return;
    }

    async function loadInvitation() {
      try {
        setLoadingInvitation(true);

        let url = "";

        // ✅ עדיפות 1 – invitationId
        if (invitationIdFromUrl) {
          url = `/api/invitations/${invitationIdFromUrl}`;
        }

        // ✅ עדיפות 2 – eventId (מפיקים)
        else if (eventIdFromUrl) {
          url = `/api/invitations/by-event/${eventIdFromUrl}`;
        }

        // ✅ fallback – המשתמש הנוכחי
        else {
          url = `/api/invitations/my`;
        }

        // 🔒 הגנה
        if (!url) {
          setInvitation(null);
          return;
        }

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
        console.error("❌ Failed to load invitation", err);
        setInvitation(null);
      } finally {
        setLoadingInvitation(false);
      }
    }

    loadInvitation();
  }, [isDemo, invitationIdFromUrl, eventIdFromUrl]);

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* ========================= Header ========================= */}
      <DashboardHeader
        onOpenMenu={() => setMenuOpen(true)}
        invitation={invitation}
        isDemo={isDemo}
      />

      {/* ========================= Mobile Menu ========================= */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationId={invitation?._id}
        invitationShareId={invitation?.shareId}
        eventId={eventIdForMenu}
        isDemo={isDemo}
      />

      {/* ========================= Content ========================= */}
      <main className="pt-16">{!loadingInvitation && children}</main>
    </div>
  );
}