"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { userHasWeddingChallengesEntitlement, userIsWeddingChallengesOnly } from "@/lib/weddingChallenges/entitlement";

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
  invitationSettings?: {
    rsvpSiteMode?: unknown;
    guestExperienceType?: unknown;
  };
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
};

/* ============================================================
   Layout
============================================================ */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#faf7f3] text-sm text-[#7C6A58]">
          טוען...
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // 🧪 דמו = כל מה שמתחיל ב־/try
  const isDemo = pathname.startsWith("/try");

  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invitationLoaded, setInvitationLoaded] = useState(false);

  const eventIdFromUrl = searchParams.get("eventId");
  const invitationIdFromUrl = searchParams.get("invitationId");

  const canOpenEventManagement =
    user?.accessModules?.eventProduction === true ||
    user?.includeEventManagement === true ||
    user?.selfManageEnabled === true;

  const canOpenTransportationManagement =
    user?.accessModules?.transportationManagement === true ||
    user?.includeTransportationManagement === true;

  const canOpenWeddingChallenges = userHasWeddingChallengesEntitlement(user as any);
  const gameOnly = userIsWeddingChallengesOnly(user as any);
  const dashboardHome = gameOnly ? "/dashboard/wedding-challenges" : "/dashboard";

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
      setInvitationLoaded(true);
      return;
    }

    let cancelled = false;

    async function loadInvitation() {
      try {
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
        setInvitationLoaded(true);

        if (data?.success && data.invitation) {
          setInvitation(data.invitation);
        } else {
          setInvitation(null);
        }
      } catch (err) {
        console.error("❌ Failed to load invitation", err);

        if (!cancelled) {
          setInvitationLoaded(true);
          setInvitation(null);
        }
      }
    }

    loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [isDemo, resolvedInvitationId, eventIdFromUrl]);

  useEffect(() => {
    if (isDemo || !invitationLoaded) return;
    if (pathname !== "/dashboard") return;
    if (gameOnly) {
      router.replace("/dashboard/wedding-challenges");
    }
  }, [
    isDemo,
    invitationLoaded,
    pathname,
    gameOnly,
    router,
  ]);

  useEffect(() => {
    if (isDemo || !gameOnly) return;
    const inviteOnlyRoutes = [
      "/dashboard/create-invite",
      "/dashboard/edit-invite",
      "/dashboard/seating",
      "/dashboard/messages",
      "/dashboard/guest-messages",
      "/dashboard/wedding-website",
      "/dashboard/invitations",
    ];
    if (inviteOnlyRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      router.replace("/dashboard/wedding-challenges");
    }
  }, [isDemo, gameOnly, pathname, router]);

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
        homeHref={dashboardHome}
        gameOnly={gameOnly}
      />

      {/* ========================= Mobile Menu ========================= */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationId={invitation?._id || resolvedInvitationId}
        invitationShareId={invitation?.shareId}
        rsvpSiteMode={
          invitation?.invitationSettings?.rsvpSiteMode ?? invitation?.rsvpSiteMode
        }
        guestExperienceType={
          invitation?.invitationSettings?.guestExperienceType ??
          invitation?.guestExperienceType
        }
        eventId={eventIdForMenu}
        canOpenEventManagement={canOpenEventManagement}
        canOpenTransportationManagement={canOpenTransportationManagement}
        canOpenWeddingChallenges={canOpenWeddingChallenges}
        gameOnly={gameOnly}
        isDemo={isDemo}
      />

      {/* ========================= Content ========================= */}
      {/* Always keep children mounted. Gating on invitation loading remounts
          the dashboard and restarts loadUser/loadGuests in a loop. */}
      <main className="pt-16">{children}</main>
    </div>
  );
}