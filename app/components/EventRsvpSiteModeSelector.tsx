"use client";

import { useEffect, useState } from "react";
import { Link2, Sparkles } from "lucide-react";
import {
  isPersonalRsvpSite,
  normalizeRsvpSiteMode,
  RSVP_SITE_MODE_DEFAULT,
  RSVP_SITE_MODE_OPTIONS,
  type RsvpSiteMode,
} from "@/types/rsvpSite";
import { useAuth } from "@/context/AuthContext";

type Props = {
  invitationId: string;
};

export default function EventRsvpSiteModeSelector({ invitationId }: Props) {
  const { user } = useAuth();
  const userAllowsPersonal = isPersonalRsvpSite(user?.rsvpSiteMode);
  const [mode, setMode] = useState<RsvpSiteMode>(RSVP_SITE_MODE_DEFAULT);
  const [invitationSettings, setInvitationSettings] = useState<
    Record<string, unknown>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchInvitation() {
      if (!invitationId) return;

      try {
        const res = await fetch(`/api/invitations/${invitationId}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (cancelled) return;

        const storedSettings = data?.invitation?.invitationSettings || {};
        setInvitationSettings(storedSettings);
        setMode(normalizeRsvpSiteMode(storedSettings.rsvpSiteMode));
      } catch (err) {
        console.error("Failed loading RSVP site mode", err);
        if (!cancelled) {
          setMode(RSVP_SITE_MODE_DEFAULT);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInvitation();

    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const saveMode = async (nextMode: RsvpSiteMode) => {
    if (!invitationId || saving) return;

    const previousMode = mode;
    setMode(nextMode);
    setSaved(false);

    try {
      setSaving(true);

      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationSettings: {
            ...invitationSettings,
            rsvpSiteMode: nextMode,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setMode(previousMode);
        console.error("Failed saving RSVP site mode", data);
        return;
      }

      setSaved(true);
      setInvitationSettings((prev) => ({
        ...prev,
        rsvpSiteMode: nextMode,
      }));
    } catch (err) {
      setMode(previousMode);
      console.error("Failed saving RSVP site mode", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        className="
          rounded-[28px]
          border
          border-[#E7DED1]
          bg-white/85
          px-6
          py-10
          text-center
          text-sm
          font-bold
          text-[#8A7B69]
          shadow-sm
        "
      >
        טוען סוג אתר...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="
        relative
        overflow-hidden
        rounded-[34px]
        border
        border-[#E3D0B8]
        bg-[#FFFDF9]
        shadow-[0_22px_70px_rgba(92,65,35,0.13)]
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          -left-24
          -top-24
          h-64
          w-64
          rounded-full
          bg-[#D9B46F]/24
          blur-3xl
        "
      />

      <div
        className="
          relative
          z-10
          border-b
          border-[#EFE4D6]
          bg-gradient-to-l
          from-[#F8EBD7]
          via-[#FFF8EE]
          to-[#FFFFFF]
          px-7
          py-6
        "
      >
        <div
          className="
            mb-3
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[#D9B46F]/45
            bg-white/75
            px-4
            py-1.5
            text-xs
            font-black
            text-[#8B5E34]
            shadow-sm
          "
        >
          🌐 סוג אתר אישורי הגעה
        </div>

        <h2 className="text-2xl font-black tracking-tight text-[#241A14]">
          בחירת אתר לאורחים
        </h2>

        <p className="mt-2 max-w-[720px] text-sm font-semibold leading-relaxed text-[#8A7B69]">
          {userAllowsPersonal || mode === "personal"
            ? "ללקוח הזה נפתח אתר חתונה אישי. אפשר לערוך אותו מדשבורד אתר החתונה."
            : "הלקוח הזה מקבל קישור אישי לכל אורח, כמו הלקוחות הקיימים. אתר חתונה נפתח רק בהקמת משתמש או בהפעלה ידנית באדמין."}
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-4 px-7 py-6 lg:grid-cols-2">
        {RSVP_SITE_MODE_OPTIONS.filter((option) => {
          if (option.value === "personal") {
            return userAllowsPersonal || mode === "personal";
          }
          return true;
        }).map((option) => {
          const selected = mode === option.value;
          const isPersonal = option.value === "personal";

          return (
            <button
              key={option.value}
              type="button"
              disabled={saving}
              onClick={() => saveMode(option.value)}
              className={`
                group
                relative
                rounded-[26px]
                border
                p-5
                text-right
                transition
                disabled:cursor-wait
                disabled:opacity-70
                ${
                  selected
                    ? "border-[#D9B46F] bg-[#FFF9EF] shadow-[0_14px_36px_rgba(184,132,79,0.13)]"
                    : "border-[#EFE4D6] bg-white/82 shadow-[0_10px_26px_rgba(91,63,31,0.055)] hover:border-[#E7D0B0]"
                }
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    ${
                      selected
                        ? "bg-[#B8844F] text-white"
                        : "bg-[#FFF4DF] text-[#B8844F]"
                    }
                  `}
                >
                  {isPersonal ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Link2 className="h-5 w-5" />
                  )}
                </div>

                <div
                  className={`
                    flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border-2
                    ${
                      selected
                        ? "border-[#B8844F] bg-[#B8844F]"
                        : "border-[#D8D2C9] bg-white"
                    }
                  `}
                >
                  {selected ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-[#241A14]">
                    {option.title}
                  </h3>

                  {option.badge ? (
                    <span
                      className="
                        rounded-full
                        border
                        border-[#E7D0B0]
                        bg-[#FFF4DF]
                        px-2.5
                        py-0.5
                        text-[11px]
                        font-black
                        text-[#B8844F]
                      "
                    >
                      {option.badge}
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-xs font-semibold leading-relaxed text-[#8A7B69]">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="
          relative
          z-10
          border-t
          border-[#EFE4D6]
          bg-[#FCFAF6]
          px-7
          py-5
        "
      >
        <p className="text-sm font-bold text-[#8A7B69]">
          {saving
            ? "שומר בחירה..."
            : saved
              ? "הבחירה נשמרה."
              : mode === "personal"
                ? "נבחר אתר חתונה אישי — האורחים יקבלו קישור לאתר."
                : "נבחר קישור אישי לכל אורח — זה מה שהלקוחות הקיימים מקבלים."}
        </p>
        {mode === "personal" ? (
          <a
            href="/dashboard/wedding-website"
            className="mt-3 inline-flex text-sm font-black text-[#B8844F]"
          >
            לעריכת אתר החתונה
          </a>
        ) : null}
      </div>
    </div>
  );
}
