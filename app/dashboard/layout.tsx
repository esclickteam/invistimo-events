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
  const [invitationShareId, setInvitationShareId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success) {
          setInvitationShareId(data.invitation?.shareId);
        }
      } catch (e) {
        console.error("Failed to load invitation for menu");
      }
    }

    loadInvitation();
  }, []);

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* Header */}
      <DashboardHeader onOpenMenu={() => setMenuOpen(true)} />

      {/* Mobile menu */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationShareId={invitationShareId}
      />

      {/* Content */}
      <main className="pt-2">{children}</main>
    </div>
  );
}
