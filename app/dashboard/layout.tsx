"use client";

import { useState } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardMobileMenu from "./DashboardMobileMenu";

export default function DashboardLayout({
  children,
  invitation,
}: {
  children: React.ReactNode;
  invitation?: {
    shareId?: string;
  };
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* Header של הדשבורד – כולל המבורגר במובייל */}
      <DashboardHeader onOpenMenu={() => setMenuOpen(true)} />

      {/* תפריט מובייל – דשבורד בלבד */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        invitationShareId={invitation?.shareId}
      />

      {/* תוכן */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
