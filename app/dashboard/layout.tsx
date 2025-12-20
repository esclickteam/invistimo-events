"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardMobileMenu from "./DashboardMobileMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [invitation, setInvitation] = useState<any | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* Header (mobile only) */}
      <DashboardHeader
        onOpenMenu={() => setMenuOpen(true)}
        invitation={invitation}
      />

      {/* Mobile menu */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationShareId={invitation?.shareId}
      />

      {/* Content */}
      <main className="pt-0">
        {children}
      </main>
    </div>
  );
}
