"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  LayoutDashboard,
  Palette,
  Handshake,
  CalendarDays,
  ListChecks,
  Wine,
  Gift,
  Menu,
  X,
} from "lucide-react";

const TABS = [
  {
    key: "overview",
    label: "תמונת מצב",
    icon: LayoutDashboard,
  },
  {
    key: "planning",
    label: "תכנון וקונספט",
    icon: Palette,
  },
  {
    key: "suppliers",
    label: "ספקים ותקציב",
    icon: Handshake,
  },
  {
    key: "calendar",
    label: "לוח שנה ופגישות",
    icon: CalendarDays,
  },
  {
    key: "logistics",
    label: "לוגיסטיקה",
    icon: ListChecks,
  },
  {
    key: "alcohol",
    label: "אלכוהול",
    icon: Wine,
  },
  {
    key: "gifts",
    label: "מתנות מהאירוע",
    icon: Gift,
  },
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  calendar,
  logistics,
  alcohol,
  gifts,
  liveGuests,
  liveSeating,
  invitation,
  eventId,
  basePath = "/events/production",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTab = (searchParams.get("tab") || "overview").split("/")[0];

  const activeTabData =
    TABS.find((tab) => tab.key === activeTab) || TABS[0];

  const ActiveIcon = activeTabData.icon;

  const changeTab = (tabKey) => {
    const params = new URLSearchParams(searchParams.toString());

    if (eventId && !params.get("eventId")) {
      params.set("eventId", eventId);
    }

    params.set("tab", tabKey);

    setMobileMenuOpen(false);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div dir="rtl" className="space-y-8 pt-[102px]">
      {/* ================= MOBILE TABS HAMBURGER ================= */}
      <div
        className="
          sticky
          top-[102px]
          z-[60]
          border-b
          border-[#E8DDD3]
          bg-[#F8F3ED]/92
          px-4
          py-3
          backdrop-blur-xl
          md:hidden
        "
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="
            flex
            w-full
            items-center
            justify-between
            gap-3
            rounded-full
            border
            border-[#E7D8FF]
            bg-gradient-to-br
            from-[#F4EDFF]
            via-white
            to-[#FBF7F1]
            px-4
            py-3
            text-right
            shadow-[0_14px_35px_rgba(132,90,223,0.12)]
            active:scale-[0.985]
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[#8B5CF6]
                text-white
                shadow-[0_8px_20px_rgba(139,92,246,0.25)]
              "
            >
              <ActiveIcon size={18} />
            </span>

            <div className="min-w-0">
              <p className="text-[11px] font-black text-[#8B5CF6]">
                תפריט ניהול אירוע
              </p>

              <p className="truncate text-[16px] font-black text-[#1E1B2E]">
                {activeTabData.label}
              </p>
            </div>
          </div>

          <span
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-white
              text-[#1E1B2E]
              shadow-sm
            "
          >
            <Menu size={23} strokeWidth={2.6} />
          </span>
        </button>
      </div>

      {/* ================= DESKTOP TABS ================= */}
      <div
        className="
          sticky
          top-[102px]
          z-[60]
          hidden
          border-b
          border-[#E8DDD3]
          bg-[#F8F3ED]/90
          backdrop-blur-xl
          md:block
        "
      >
        <div className="mx-auto max-w-7xl px-4">
          <div
            className="
              flex
              flex-wrap
              items-center
              justify-center
              gap-3
              py-4
              overflow-visible
            "
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key)}
                  className={`
                    group
                    relative
                    flex
                    items-center
                    gap-2
                    whitespace-nowrap
                    rounded-full
                    border
                    px-5
                    py-3
                    text-sm
                    font-black
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? `
                          border-[#E7D8FF]
                          bg-gradient-to-br
                          from-[#F4EDFF]
                          via-white
                          to-[#FBF7F1]
                          text-[#1E1B2E]
                          shadow-[0_14px_35px_rgba(132,90,223,0.14)]
                        `
                        : `
                          border-transparent
                          bg-white/70
                          text-[#6F6678]
                          hover:border-[#E8DDD3]
                          hover:bg-white
                          hover:text-[#1E1B2E]
                          hover:shadow-[0_10px_25px_rgba(120,90,60,0.07)]
                        `
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      transition
                      ${
                        isActive
                          ? `
                            bg-[#8B5CF6]
                            text-white
                            shadow-[0_8px_20px_rgba(139,92,246,0.25)]
                          `
                          : `
                            bg-[#F5E7DC]
                            text-[#7A4A35]
                            group-hover:bg-[#EFE4DA]
                          `
                      }
                    `}
                  >
                    <Icon size={15} />
                  </span>

                  <span>{tab.label}</span>

                  {isActive && (
                    <span
                      className="
                        absolute
                        -bottom-[17px]
                        left-1/2
                        h-[3px]
                        w-10
                        -translate-x-1/2
                        rounded-full
                        bg-[#8B5CF6]
                      "
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MOBILE MENU MODAL ================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden" dir="rtl">
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={() => setMobileMenuOpen(false)}
            className="
              absolute
              inset-0
              bg-[#1f1710]/45
              backdrop-blur-[3px]
            "
          />

          <div
            className="
              absolute
              inset-x-4
              top-24
              max-h-[calc(100dvh-120px)]
              overflow-hidden
              rounded-[30px]
              border
              border-[#E1CDAE]
              bg-[#FBF4EA]
              shadow-[0_30px_90px_rgba(35,24,14,0.32)]
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-[#E1D0B8]
                bg-[radial-gradient(circle_at_top_left,#F3E2C5_0%,#FBF4EA_52%,#F8EFE4_100%)]
                px-5
                py-5
              "
            >
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="סגירה"
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-white/85
                  text-[#6A4B32]
                  shadow-[0_10px_24px_rgba(75,52,31,0.13)]
                  ring-1
                  ring-[#E7D5BA]
                  active:scale-95
                "
              >
                <X size={24} strokeWidth={2.5} />
              </button>

              <div className="min-w-0 text-right">
                <p className="text-[12px] font-black tracking-[0.18em] text-[#9A7444]">
                  INVISTIMO
                </p>

                <h2 className="mt-1 text-[24px] font-black leading-tight text-[#3F3025]">
                  ניהול האירוע
                </h2>

                <p className="mt-1 text-[13px] font-bold text-[#7B6A5B]">
                  מעבר מהיר בין הטאבים
                </p>
              </div>
            </div>

            <div
              className="
                max-h-[calc(100dvh-245px)]
                overflow-y-auto
                overscroll-contain
                px-4
                py-4
                pb-[calc(18px+env(safe-area-inset-bottom))]
              "
            >
              <nav className="grid grid-cols-1 gap-3">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => changeTab(tab.key)}
                      className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-3
                        rounded-[24px]
                        border
                        px-4
                        py-3.5
                        text-right
                        transition
                        active:scale-[0.985]
                        ${
                          isActive
                            ? "border-[#B9955E] bg-[#FFF4DE] shadow-[0_12px_28px_rgba(132,91,41,0.12)]"
                            : "border-[#E3CFB0] bg-[#FFFDF8] shadow-[0_10px_24px_rgba(84,61,36,0.06)]"
                        }
                      `}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`
                            flex
                            h-12
                            w-12
                            shrink-0
                            items-center
                            justify-center
                            rounded-2xl
                            border
                            ${
                              isActive
                                ? "border-[#B9955E] bg-gradient-to-br from-[#DCC087] to-[#A77A3B] text-white"
                                : "border-[#DFC89F] bg-gradient-to-br from-[#FFF8EA] to-[#EED8B3] text-[#8A6339]"
                            }
                          `}
                        >
                          <Icon size={23} strokeWidth={2.3} />
                        </span>

                        <div className="min-w-0">
                          <h3
                            className={`
                              truncate
                              text-[17px]
                              font-black
                              ${
                                isActive ? "text-[#3F3025]" : "text-[#5A4A3C]"
                              }
                            `}
                          >
                            {tab.label}
                          </h3>

                          {isActive && (
                            <p className="mt-0.5 text-[12px] font-black text-[#A47B43]">
                              הטאב הנוכחי
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`
                          shrink-0
                          rounded-full
                          px-3
                          py-1
                          text-[11px]
                          font-black
                          ${
                            isActive
                              ? "bg-[#3F3025] text-white"
                              : "bg-[#F4E8D8] text-[#9A7444]"
                          }
                        `}
                      >
                        {isActive ? "נבחר" : "פתח"}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTENT ================= */}
      <div className="mx-auto max-w-7xl px-4 pb-12">
        {activeTab === "overview" && overview}
        {activeTab === "planning" && planning}
        {activeTab === "suppliers" && suppliers}
        {activeTab === "calendar" && calendar}
        {activeTab === "logistics" && logistics}
        {activeTab === "alcohol" && alcohol}
        {activeTab === "gifts" && gifts}
        {activeTab === "live-guests" && liveGuests}
        {activeTab === "live-seating" && liveSeating}
      </div>
    </div>
  );
}