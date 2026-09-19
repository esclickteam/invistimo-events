"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import {
  userHasWeddingChallengesEntitlement,
  userIsWeddingChallengesOnly,
} from "@/lib/weddingChallenges/entitlement";

import DashboardHeader from "./DashboardHeader";
import DashboardMobileMenu from "./DashboardMobileMenu";
import DashboardSidebar, {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "./components/DashboardSidebar";

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

  const isDemo = pathname.startsWith("/try");

  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invitationLoaded, setInvitationLoaded] = useState(false);
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const eventIdFromUrl = searchParams.get("eventId");
  const invitationIdFromUrl = searchParams.get("invitationId");

  const canOpenEventManagement =
    user?.accessModules?.eventProduction === true ||
    user?.includeEventManagement === true ||
    user?.selfManageEnabled === true;

  const canOpenTransportationManagement =
    user?.accessModules?.transportationManagement === true ||
    user?.includeTransportationManagement === true;

  const canOpenWeddingChallenges = userHasWeddingChallengesEntitlement(
    user as any
  );
  const gameOnly = userIsWeddingChallengesOnly(user as any);
  const dashboardHome = gameOnly
    ? "/dashboard/wedding-challenges"
    : "/dashboard";

  const invitationIdFromPath = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const invitationsIndex = parts.findIndex((part) => part === "invitations");
    if (invitationsIndex === -1) return "";
    const id = parts[invitationsIndex + 1];
    if (!id) return "";
    if (id === "create" || id === "edit" || id === "new") return "";
    return id;
  }, [pathname]);

  const resolvedInvitationId = invitationIdFromUrl || invitationIdFromPath;

  const eventIdForMenu = useMemo(() => {
    if (isDemo) return "demo-event-001";
    return eventIdFromUrl || invitation?.eventId || "";
  }, [isDemo, eventIdFromUrl, invitation?.eventId]);

  const isSeatingPage =
    pathname === "/dashboard/seating" ||
    pathname.startsWith("/dashboard/seating/") ||
    pathname === "/try/dashboard/seating" ||
    pathname.startsWith("/try/dashboard/seating/");

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed());
  }, []);

  useEffect(() => {
    if (isDemo) {
      setInvitation({
        _id: "demo",
        shareId: "demo",
        title: "אירוע לדוגמה",
        eventId: "demo-event-001",
      });
      setInvitationLoaded(true);
      setCheckInEnabled(true);
      return;
    }

    let cancelled = false;

    async function loadInvitation() {
      try {
        let url = "";
        if (resolvedInvitationId) {
          url = `/api/invitations/${resolvedInvitationId}`;
        } else if (eventIdFromUrl) {
          url = `/api/invitations/by-event/${eventIdFromUrl}`;
        } else {
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
    if (isDemo) return;
    const eventId = eventIdForMenu;
    if (!eventId) {
      setCheckInEnabled(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/events/${eventId}/check-in-settings`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setCheckInEnabled(Boolean(data?.checkInEnabled));
      })
      .catch(() => {
        if (!cancelled) setCheckInEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isDemo, eventIdForMenu]);

  useEffect(() => {
    if (isDemo || !invitationLoaded) return;
    if (pathname !== "/dashboard") return;
    if (gameOnly) {
      router.replace("/dashboard/wedding-challenges");
    }
  }, [isDemo, invitationLoaded, pathname, gameOnly, router]);

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
      "/dashboard/check-in",
      "/dashboard/reports",
    ];
    if (
      inviteOnlyRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
    ) {
      router.replace("/dashboard/wedding-challenges");
    }
  }, [isDemo, gameOnly, pathname, router]);

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  const showSidebar = !isSeatingPage && !gameOnly;

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      <DashboardHeader
        onOpenMenu={() => setMenuOpen(true)}
        invitation={invitation}
        isDemo={isDemo}
        homeHref={dashboardHome}
        gameOnly={gameOnly}
        eventId={eventIdForMenu}
        canOpenWeddingChallenges={canOpenWeddingChallenges}
      />

      {showSidebar && (
        <DashboardSidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleCollapsed}
          invitationId={invitation?._id || resolvedInvitationId}
          invitationShareId={invitation?.shareId}
          rsvpSiteMode={
            invitation?.invitationSettings?.rsvpSiteMode ??
            invitation?.rsvpSiteMode
          }
          guestExperienceType={
            invitation?.invitationSettings?.guestExperienceType ??
            invitation?.guestExperienceType
          }
          eventId={eventIdForMenu}
          checkInEnabled={checkInEnabled}
          canOpenEventManagement={canOpenEventManagement}
          canOpenTransportationManagement={canOpenTransportationManagement}
          canOpenWeddingChallenges={canOpenWeddingChallenges}
          gameOnly={gameOnly}
          isDemo={isDemo}
        />
      )}

      {/* Legacy mobile menu kept for demo / game-only paths without sidebar */}
      {!showSidebar && (
        <DashboardMobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          invitationId={invitation?._id || resolvedInvitationId}
          invitationShareId={invitation?.shareId}
          rsvpSiteMode={
            invitation?.invitationSettings?.rsvpSiteMode ??
            invitation?.rsvpSiteMode
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
      )}

      <main
        className={`pt-16 transition-[padding] duration-200 ${
          showSidebar
            ? sidebarCollapsed
              ? "lg:pr-[72px]"
              : "lg:pr-[240px]"
            : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
