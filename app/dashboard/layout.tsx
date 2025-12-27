"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import DashboardHeader from "./DashboardHeader";
import DashboardMobileMenu from "./DashboardMobileMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDemo = pathname.startsWith("/try");

  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<any | null>(null);

  useEffect(() => {
    // ⭐️ בדמו – לא טוענים הזמנה אמיתית
    if (isDemo) {
      setInvitation({
        _id: "demo",
        shareId: "demo",
      });
      return;
    }

    async function loadInvitation() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (data.success && data.invitation) {
          setInvitation(data.invitation);
        }
      } catch (e) {
        console.error("Failed to load invitation for dashboard layout");
      }
    }

    loadInvitation();
  }, [isDemo]);

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* Header (mobile only) */}
      <DashboardHeader
        onOpenMenu={() => setMenuOpen(true)}
        invitation={invitation}
        isDemo={isDemo}
      />

      {/* Mobile menu */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationShareId={invitation?.shareId}
        isDemo={isDemo}
      />

      {/* Content */}
      <main className="pt-0">
        {children}
      </main>
    </div>
  );
}
