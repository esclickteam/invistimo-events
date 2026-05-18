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

    if (eventId) {
      go(`/events/production?eventId=${eventId}&tab=overview`);
      return;
    }

    go("/events/production?tab=overview");
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
      {open && (
        <div className="fixed inset-0 z-[9999] md:hidden" dir="rtl">
          {/* dark background */}
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={onClose}
            className="
              absolute inset-0
              bg-[#1f1710]/55
              backdrop-blur-[3px]
            "
          />

          {/* menu panel - כמו בצילום */}
          <section
            className="
              absolute inset-y-0 right-0
              flex h-[100dvh] w-[calc(100%-46px)] max-w-[760px] flex-col
              overflow-hidden
              border-l border-[#DFCFB7]
              bg-[#FBF4EA]
              shadow-[0_35px_120px_rgba(35,24,14,0.45)]
            "
          >
            {/* top area */}
            <div
              className="
                relative shrink-0 overflow-hidden
                border-b border-[#E1D0B8]
                bg-[radial-gradient(circle_at_top_left,#F3E2C5_0%,#FBF4EA_48%,#F8EFE4_100%)]
                px-6 pb-8 pt-8
                text-center
              "
            >
              <div className="absolute -top-20 -left-16 h-44 w-44 rounded-full bg-white/55 blur-3xl" />
              <div className="absolute -bottom-16 right-8 h-40 w-40 rounded-full bg-[#D8B97A]/25 blur-3xl" />

              <button
                type="button"
                onClick={onClose}
                aria-label="סגירה"
                className="
                  absolute left-6 top-7 z-10
                  flex h-[74px] w-[74px] items-center justify-center
                  rounded-full
                  bg-white/90
                  text-[#6A4B32]
                  shadow-[0_18px_38px_rgba(75,52,31,0.16)]
                  ring-1 ring-[#E7D5BA]
                  transition
                  active:scale-95
                "
              >
                <X size={34} strokeWidth={2.5} />
              </button>

              <div
                className="
                  relative mx-auto inline-flex items-center justify-center gap-2
                  rounded-full
                  border border-[#D9BB83]
                  bg-white/75
                  px-6 py-2.5
                  text-[14px] font-black
                  tracking-[0.26em]
                  text-[#8A663D]
                  shadow-[0_10px_25px_rgba(123,86,45,0.08)]
                "
              >
                INVISTIMO
                <Sparkles size={16} />
              </div>

              <h2 className="relative mt-8 text-[40px] font-black leading-tight text-[#3F3025]">
                ניהול האירוע
              </h2>

              <p className="relative mx-auto mt-5 max-w-[430px] text-[18px] font-bold leading-9 text-[#7B6A5B]">
                כל הפעולות החשובות לניהול ההזמנה, ההושבה וההודעות במקום אחד.
              </p>
            </div>

            {/* scroll area */}
            <div
              className="
                min-h-0 flex-1 overflow-y-auto
                overscroll-contain
                px-7 pb-[calc(34px+env(safe-area-inset-bottom))] pt-7
              "
            >
              <nav className="flex flex-col gap-5">
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
                          rounded-[34px]
                          border border-[#E1CDAE]
                          bg-[#FFFDF8]
                          px-5 py-6
                          text-right
                          shadow-[0_18px_45px_rgba(84,61,36,0.08)]
                          transition
                          active:scale-[0.985]
                        "
                      >
                        <div
                          className="
                            absolute inset-0
                            bg-[radial-gradient(circle_at_top_right,#F4E5CE_0%,transparent_45%)]
                            opacity-70
                          "
                        />

                        <div className="relative flex items-center gap-5">
                          <div
                            className="
                              flex h-[70px] w-[70px] shrink-0 items-center justify-center
                              rounded-[24px]
                              border border-[#DFC89F]
                              bg-gradient-to-br from-[#FFF8EA] to-[#EED8B3]
                              text-[#8A6339]
                              shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_rgba(111,78,42,0.12)]
                            "
                          >
                            <Icon size={31} strokeWidth={2.2} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <span
                                className="
                                  shrink-0 rounded-full
                                  border border-[#E0C89F]
                                  bg-[#FFF8ED]
                                  px-4 py-1.5
                                  text-[14px] font-black
                                  text-[#9A7444]
                                "
                              >
                                {item.badge}
                              </span>

                              <h3 className="text-[27px] font-black leading-tight text-[#3F3025]">
                                {item.title}
                              </h3>
                            </div>

                            <p className="mt-3 text-[17px] font-bold leading-8 text-[#7B6756]">
                              {item.subtitle}
                            </p>
                          </div>

                          <ChevronLeft
                            size={25}
                            className="shrink-0 text-[#B39362]"
                            strokeWidth={2.6}
                          />
                        </div>
                      </button>
                    );
                  })}
              </nav>

              <div
                className="
                  mt-6 rounded-[30px]
                  border border-[#E1CDAE]
                  bg-gradient-to-br from-[#FFF9EF] to-[#F0DEC1]
                  p-6
                  text-center
                  shadow-[0_18px_45px_rgba(84,61,36,0.08)]
                "
              >
                <p className="text-[16px] font-black leading-8 text-[#6D5844]">
                  טיפ קטן: אפשר לחזור לכאן בכל רגע כדי לערוך, לשלוח הודעות או
                  לעבור להושבה.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center px-4 pb-6">
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