"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  PencilLine,
  Settings2,
  Eye,
  Armchair,
  MessageCircle,
  Plus,
  LockKeyhole,
  Sparkles,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  invitationId?: string;
  invitationShareId?: string;
  eventId?: string;
  isDemo?: boolean;
};

export default function DashboardMobileMenu({
  open,
  onClose,
  invitationId,
  invitationShareId,
  eventId,
  isDemo = false,
}: Props) {
  const router = useRouter();
  const [showDemoModal, setShowDemoModal] = useState(false);

  const hasInvitation = Boolean(invitationId);
  const hasEvent = Boolean(eventId);

  if (!open && !showDemoModal) return null;

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  const demoBlock = () => {
    onClose();
    setShowDemoModal(true);
  };

  const openInvitationPreview = () => {
    if (!invitationShareId) return;

    if (isDemo) {
      demoBlock();
      return;
    }

    onClose();

    window.open(
      `https://www.invistimo.com/invite/${invitationShareId}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openEventManagement = () => {
    if (isDemo) {
      go("/try/events/production?tab=overview");
      return;
    }

    if (!hasEvent) {
      go("/events/production?tab=overview");
      return;
    }

    go(`/events/production?eventId=${eventId}&tab=overview`);
  };

  const menuItems = [
    {
      title: hasInvitation ? "עריכת הזמנה" : "יצירת הזמנה",
      subtitle: hasInvitation
        ? "עיצוב, טקסטים ותצוגת ההזמנה"
        : "בניית הזמנה דיגיטלית חדשה",
      icon: hasInvitation ? PencilLine : Plus,
      badge: hasInvitation ? "הזמנה" : "חדש",
      onClick: () => {
        if (isDemo) {
          demoBlock();
          return;
        }

        go(
          hasInvitation
            ? `/dashboard/edit-invite/${invitationId}`
            : "/dashboard/create-invite"
        );
      },
    },
    {
      title: "עריכת פרטי האירוע",
      subtitle: "תאריך, שעה, אולם, מיקום ופרטים כלליים",
      icon: Settings2,
      badge: "אירוע",
      onClick: () => {
        if (isDemo) {
          demoBlock();
          return;
        }

        go("/dashboard/event");
      },
    },
    {
      title: "צפייה בהזמנה",
      subtitle: "פתיחת ההזמנה כפי שהאורחים רואים אותה",
      icon: Eye,
      badge: "Preview",
      hidden: !invitationShareId,
      onClick: openInvitationPreview,
    },
    {
      title: "סידורי הושבה",
      subtitle: "שולחנות, קבוצות, Live והושבה חכמה",
      icon: Armchair,
      badge: "Seating",
      onClick: () =>
        isDemo ? go("/try/dashboard/seating") : go("/dashboard/seating"),
    },
    {
      title: "ניהול אירוע",
      subtitle: "פרטי אירוע, ניהול דשבורד אורחים, לוגיסטיקה וספקים",
      icon: ClipboardList,
      badge: "Production",
      onClick: openEventManagement,
    },
    {
      title: "שליחת הודעות",
      subtitle: "WhatsApp, SMS, תזכורות והודעות לאורחים",
      icon: MessageCircle,
      badge: "Messages",
      onClick: () =>
        isDemo
          ? go("/try/dashboard/messages/new")
          : go("/dashboard/messages/new"),
    },
  ];

  return (
    <>
      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
          {/* Overlay */}
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={onClose}
            className="
              absolute inset-0
              bg-[#1f1710]/45
              backdrop-blur-[3px]
            "
          />

          <aside
            className="
              absolute top-0 right-0
              h-full w-[88%] max-w-[390px]
              overflow-hidden
              border-l border-[#E7D7C1]
              bg-[#FBF6EF]
              shadow-[0_30px_90px_rgba(39,28,17,0.35)]
            "
          >
            {/* Top luxury background */}
            <div
              className="
                relative overflow-hidden
                border-b border-[#E8D8C2]
                bg-[radial-gradient(circle_at_top_right,#EAD8B8_0%,#FBF6EF_42%,#F7EFE5_100%)]
                px-6 pb-7 pt-6
              "
            >
              <div className="absolute -top-16 -left-14 h-36 w-36 rounded-full bg-white/45 blur-2xl" />
              <div className="absolute -bottom-12 right-8 h-28 w-28 rounded-full bg-[#D6B678]/25 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="סגירה"
                  className="
                    flex h-11 w-11 items-center justify-center
                    rounded-full
                    border border-[#E4D4BF]
                    bg-white/75
                    text-[#5B4635]
                    shadow-[0_10px_25px_rgba(87,63,38,0.12)]
                    transition
                    active:scale-95
                  "
                >
                  <X size={22} strokeWidth={2.4} />
                </button>

                <div className="text-right">
                  <div
                    className="
                      inline-flex items-center gap-2
                      rounded-full
                      border border-[#E3CFB0]
                      bg-white/60
                      px-3 py-1
                      text-[11px] font-black
                      tracking-[0.18em]
                      text-[#9A7444]
                    "
                  >
                    <Sparkles size={13} />
                    INVISTIMO
                  </div>

                  <h2 className="mt-4 text-[27px] font-black leading-tight text-[#3F3025]">
                    ניהול האירוע
                  </h2>

                  <p className="mt-2 max-w-[250px] text-[13px] font-medium leading-6 text-[#7B6756]">
                    כל הפעולות החשובות לניהול ההזמנה, ההושבה וההודעות במקום אחד.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="h-[calc(100%-165px)] overflow-y-auto px-4 py-5">
              <nav className="flex flex-col gap-3">
                {menuItems
                  .filter((item) => !item.hidden)
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={item.onClick}
                        className="
                          group relative
                          w-full overflow-hidden
                          rounded-[26px]
                          border border-[#E8D8C2]
                          bg-white/78
                          px-4 py-4
                          text-right
                          shadow-[0_12px_34px_rgba(92,68,42,0.08)]
                          transition
                          active:scale-[0.985]
                        "
                      >
                        <div className="absolute inset-0 bg-gradient-to-l from-[#F4E6D1]/65 via-white/20 to-transparent opacity-0 transition group-active:opacity-100" />

                        <div className="relative flex items-center gap-4">
                          <div
                            className="
                              flex h-12 w-12 shrink-0 items-center justify-center
                              rounded-2xl
                              border border-[#E3CFB0]
                              bg-gradient-to-br from-[#FFF8EC] to-[#EBD8B9]
                              text-[#7A5731]
                              shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_22px_rgba(104,75,42,0.12)]
                            "
                          >
                            <Icon size={22} strokeWidth={2.2} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[17px] font-black text-[#3F3025]">
                                {item.title}
                              </span>

                              <span
                                className="
                                  shrink-0 rounded-full
                                  border border-[#E7D5B9]
                                  bg-[#FBF3E8]
                                  px-2.5 py-1
                                  text-[10px] font-black
                                  text-[#9A7444]
                                "
                              >
                                {item.badge}
                              </span>
                            </div>

                            <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-[#7B6756]">
                              {item.subtitle}
                            </p>
                          </div>

                          <ChevronLeft
                            size={19}
                            className="shrink-0 text-[#B69A72]"
                            strokeWidth={2.4}
                          />
                        </div>
                      </button>
                    );
                  })}
              </nav>

              {/* Bottom note */}
              <div
                className="
                  mt-5 rounded-[24px]
                  border border-[#E8D8C2]
                  bg-gradient-to-br from-[#FFF9F0] to-[#F2E4CF]
                  p-4
                  text-center
                  shadow-[0_12px_32px_rgba(92,68,42,0.07)]
                "
              >
                <p className="text-[13px] font-bold leading-6 text-[#6D5844]">
                  טיפ קטן: אפשר לחזור לכאן בכל רגע כדי לערוך, לשלוח הודעות או
                  לעבור להושבה.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-6">
          <button
            type="button"
            aria-label="סגירת חלון"
            className="absolute inset-0 bg-[#1f1710]/45 backdrop-blur-[3px]"
            onClick={() => setShowDemoModal(false)}
          />

          <div
            dir="rtl"
            className="
              relative w-full max-w-sm
              overflow-hidden
              rounded-[30px]
              border border-[#E7D2AE]
              bg-[#FFF8ED]
              p-5
              text-center
              shadow-[0_30px_80px_rgba(39,28,17,0.28)]
            "
          >
            <button
              type="button"
              onClick={() => setShowDemoModal(false)}
              className="
                absolute left-4 top-4
                flex h-9 w-9 items-center justify-center
                rounded-full
                bg-white/70
                text-[#6B5138]
                shadow-sm
              "
            >
              <X size={19} />
            </button>

            <div
              className="
                mx-auto mb-4
                flex h-14 w-14 items-center justify-center
                rounded-2xl
                border border-[#E5CEAA]
                bg-gradient-to-br from-[#FFFDF7] to-[#EBD7B5]
                text-[#7A5731]
                shadow-[0_12px_25px_rgba(104,75,42,0.13)]
              "
            >
              <LockKeyhole size={25} />
            </div>

            <h3 className="text-xl font-black text-[#3F3025]">
              פעולה זו סגורה בדמו
            </h3>

            <p className="mx-auto mt-2 max-w-[280px] text-sm font-medium leading-6 text-[#6D5844]">
              בדמו ניתן לצפות בדשבורד, סידורי הושבה והודעות. כדי לערוך הזמנה
              אמיתית צריך להתחבר למערכת.
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="
                mt-5 w-full
                rounded-full
                bg-gradient-to-l from-[#B9945A] to-[#D8BC82]
                px-5 py-3
                text-sm font-black
                text-white
                shadow-[0_14px_30px_rgba(154,116,68,0.25)]
                active:scale-[0.98]
              "
            >
              להתחברות
            </button>
          </div>
        </div>
      )}
    </>
  );
}