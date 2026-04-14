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

  const isDemo = pathname.startsWith("/try");

  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setInvitation({
        _id: "demo",
        shareId: "demo",
        title: "אירוע לדוגמה",
      });
      setLoadingInvitation(false);
      return;
    }

    async function loadInvitation() {
      setLoadingInvitation(true);

      try {
        const eventIdFromUrl = searchParams.get("eventId");
        console.log("🟡 DashboardLayout eventIdFromUrl:", eventIdFromUrl);

        // 1) אם הגיע ID מה-URL, קודם ננסה כ-invitationId ישיר
        if (eventIdFromUrl) {
          console.log(
            "🔵 Trying invitation by direct id:",
            `/api/invitations/${eventIdFromUrl}`
          );

          const invitationRes = await fetch(`/api/invitations/${eventIdFromUrl}`, {
            credentials: "include",
            cache: "no-store",
          });

          if (invitationRes.ok) {
            const invitationData = await invitationRes.json();
            console.log("🟢 Direct invitation response:", invitationData);

            if (invitationData?.success) {
              const loadedInvitation =
                invitationData.invitation || invitationData.data || invitationData;

              if (loadedInvitation?._id) {
                setInvitation(loadedInvitation);
                return;
              }
            }
          } else {
            const text = await invitationRes.text();
            console.error(
              "🔴 Direct invitation fetch failed:",
              invitationRes.status,
              text
            );
          }

          // 2) fallback - ננסה כ-eventId
          console.log(
            "🟠 Fallback to by-event:",
            `/api/invitations/by-event/${eventIdFromUrl}`
          );

          const byEventRes = await fetch(
            `/api/invitations/by-event/${eventIdFromUrl}`,
            {
              credentials: "include",
              cache: "no-store",
            }
          );

          if (!byEventRes.ok) {
            const text = await byEventRes.text();
            console.error(
              "🔴 by-event fetch failed:",
              byEventRes.status,
              text
            );
            setInvitation(null);
            return;
          }

          const byEventData = await byEventRes.json();
          console.log("🟢 by-event response:", byEventData);

          if (byEventData?.success && byEventData.invitation) {
            setInvitation(byEventData.invitation);
            return;
          }

          setInvitation(null);
          return;
        }

        // 3) אם אין eventId ב-URL - נביא את ההזמנה של המשתמש
        console.log("🔵 Loading my invitation: /api/invitations/my");

        const myRes = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        if (!myRes.ok) {
          const text = await myRes.text();
          console.error("🔴 /api/invitations/my failed:", myRes.status, text);
          setInvitation(null);
          return;
        }

        const myData = await myRes.json();
        console.log("🟢 my invitation response:", myData);

        if (myData?.success && myData.invitation) {
          setInvitation(myData.invitation);
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
  }, [isDemo, searchParams, pathname]);

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      <DashboardHeader
        onOpenMenu={() => setMenuOpen(true)}
        invitation={invitation}
        isDemo={isDemo}
      />

      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationId={invitation?._id}
        invitationShareId={invitation?.shareId}
        isDemo={isDemo}
      />

      <main className="pt-16">{!loadingInvitation && children}</main>
    </div>
  );
}