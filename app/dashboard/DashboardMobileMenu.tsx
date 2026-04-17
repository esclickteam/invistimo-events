"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  invitationId?: string;
  invitationShareId?: string;
  isDemo?: boolean;
};

export default function DashboardMobileMenu({
  open,
  onClose,
  invitationId,
  invitationShareId,
  isDemo = false,
}: Props) {
  const router = useRouter();
  const [showDemoModal, setShowDemoModal] = useState(false);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  const demoBlock = () => {
    onClose();
    setShowDemoModal(true);
  };

  const hasInvitation = Boolean(invitationId);

  return (
    <>
      {/* Drawer */}
      <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <aside className="absolute top-0 right-0 h-full w-[80%] max-w-xs bg-[#f5eee7] border-l border-[#e2d6c8] shadow-xl p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg text-[#4a413a]">
              ניהול האירוע
            </span>
            <button onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-5 text-[#4a413a] font-medium">
            {/* 1️⃣ יצירת / עריכת הזמנה */}
            <button
              onClick={() => {
                if (isDemo) {
                  demoBlock();
                  return;
                }

                go(
                  hasInvitation
                    ? `/dashboard/edit-invite/${invitationId}`
                    : "/dashboard/create-invite"
                );
              }}
              className="text-right"
            >
              {hasInvitation ? "✏️ עריכת הזמנה" : "➕ יצירת הזמנה"}
            </button>

            {/* 2️⃣ עריכת פרטי האירוע (פתוח תמיד) */}
            <button
              onClick={() => {
                if (isDemo) {
                  demoBlock();
                  return;
                }
                go("/dashboard/event");
              }}
              className="text-right"
            >
              🛠️ עריכת פרטי האירוע
            </button>

            {/* 3️⃣ צפייה בהזמנה */}
            {invitationShareId && (
              <button
                onClick={() =>
                  isDemo
                    ? demoBlock()
                    : window.open(
                        `https://www.invistimo.com/invite/${invitationShareId}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                }
                className="text-right"
              >
                👁️ צפייה בהזמנה
              </button>
            )}

            {/* 4️⃣ סידורי הושבה (פתוח תמיד) */}
            <button
              onClick={() =>
                isDemo ? go("/try/dashboard/seating") : go("/dashboard/seating")
              }
              className="text-right"
            >
              🪑 סידורי הושבה
            </button>

            {/* 5️⃣ שליחת הודעות (פתוח תמיד) */}
            <button
  onClick={() => go("/dashboard/messages")}
  className="text-right"
>
  💬 שליחת הודעות
</button>

          </nav>
        </aside>
      </div>

      {/* 🧪 Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDemoModal(false)}
          />

          <div className="relative w-[92%] max-w-sm mb-6 bg-[#fff7e6] border border-[#e6cfa3] text-[#5c4632] rounded-2xl shadow-xl p-5 text-center">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-3 left-3 text-gray-400"
            >
              ✕
            </button>

            <div className="text-sm mb-4">
              🧪 בדמו ניתן לצפות בדשבורד, סידורי הושבה והודעות בלבד
            </div>

            <button
              onClick={() => router.push("/login")}
              className="w-full py-2.5 rounded-full bg-[#c9b48f] text-white font-semibold"
            >
              להתחברות
            </button>
          </div>
        </div>
      )}
    </>
  );
}