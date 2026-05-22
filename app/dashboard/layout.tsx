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

  /*
    ✅ תומך גם בנתיב החדש:
    /dashboard/invitations/[id]/edit

    כי בנתיב הזה ה-ID לא נמצא ב-query,
    אלא בתוך pathname.
  */
  const invitationIdFromPath = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);

    const invitationsIndex = parts.findIndex(
      (part) => part === "invitations"
    );

    if (invitationsIndex === -1) return "";

    const id = parts[invitationsIndex + 1];

    if (!id) return "";

    // הגנה מנתיבים שלא מייצגים ID
    if (id === "create" || id === "edit" || id === "new") return "";

    return id;
  }, [pathname]);

  const resolvedInvitationId = invitationIdFromUrl || invitationIdFromPath;

  const eventIdForMenu = useMemo(() => {
    if (isDemo) return "demo-event-001";

    return eventIdFromUrl || invitation?.eventId || "";
  }, [isDemo, eventIdFromUrl, invitation?.eventId]);

  /* ============================================================
     Load Invitation
     ✅ תומך:
     - invitationId מה-query
     - invitationId מתוך pathname
     - eventId
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

    let cancelled = false;

    async function loadInvitation() {
      try {
        setLoadingInvitation(true);

        let url = "";

        // ✅ עדיפות 1 – invitationId מה-query או מהנתיב
        if (resolvedInvitationId) {
          url = `/api/invitations/${resolvedInvitationId}`;
        }

        // ✅ עדיפות 2 – eventId, למשל מפיקים
        else if (eventIdFromUrl) {
          url = `/api/invitations/by-event/${eventIdFromUrl}`;
        }

        // ✅ fallback – ההזמנה של המשתמש הנוכחי
        else {
          url = `/api/invitations/my`;
        }

        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (data?.success && data.invitation) {
          setInvitation(data.invitation);
        } else {
          setInvitation(null);
        }
      } catch (err) {
        console.error("❌ Failed to load invitation", err);

        if (!cancelled) {
          setInvitation(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingInvitation(false);
        }
      }
    }

    loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [isDemo, resolvedInvitationId, eventIdFromUrl]);

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
        invitationId={invitation?._id || resolvedInvitationId}
        invitationShareId={invitation?.shareId}
        eventId={eventIdForMenu}
        isDemo={isDemo}
      />

      {/* ========================= Content ========================= */}
      <main className="pt-16">{!loadingInvitation && children}</main>
    </div>
  );
}