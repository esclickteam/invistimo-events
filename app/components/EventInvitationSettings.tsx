"use client";

import { useEffect, useState } from "react";

type MenuOptions = {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  childrenMeal: boolean;
  kosher: boolean;
  kosherGlatt: boolean;
  kosherMahfoud: boolean;
  transportation: boolean;
};

type InvitationSettings = {
  showStoryAfterConfirm: boolean;
  showGiftLinkAfterConfirm: boolean;
  allowGuestNote: boolean;
  menuOptions: MenuOptions;
};

type Props = {
  invitationId: string;
};

const defaultSettings: InvitationSettings = {
  showStoryAfterConfirm: false,
  showGiftLinkAfterConfirm: false,
  allowGuestNote: false,
  menuOptions: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    childrenMeal: false,
    kosher: false,
    kosherGlatt: false,
    kosherMahfoud: false,
    transportation: false,
  },
};

const MENU_LABELS: Record<keyof MenuOptions, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
  kosherGlatt: "כשר גלאט",
  kosherMahfoud: "כשר מחפוד",
  transportation: "הסעות",
};

const MENU_DESCRIPTIONS: Record<keyof MenuOptions, string> = {
  vegetarian: "הצגת אפשרות למנה צמחונית בטופס אישור ההגעה",
  vegan: "הצגת אפשרות למנה טבעונית בטופס אישור ההגעה",
  glutenFree: "הצגת אפשרות לסימון רגישות / צורך במנה ללא גלוטן",
  childrenMeal: "הצגת אפשרות לבחירת מנת ילדים",
  kosher: "הצגת אפשרות לבחירת מנה כשרה",
  kosherGlatt: "הצגת אפשרות לבחירת מנה כשר גלאט",
  kosherMahfoud: "הצגת אפשרות לבחירת מנה כשר מחפוד",
  transportation: "הצגת אפשרות להצטרפות להסעות",
};

export default function InvitationSettingsComponent({ invitationId }: Props) {
  const [settings, setSettings] =
    useState<InvitationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =========================
     Load Invitation Settings
  ========================= */
  useEffect(() => {
    async function fetchInvitation() {
      if (!invitationId) return;

      try {
        const res = await fetch(`/api/invitations/${invitationId}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (data?.success && data.invitation?.invitationSettings) {
          setSettings({
            ...defaultSettings,
            ...data.invitation.invitationSettings,
            menuOptions: {
              ...defaultSettings.menuOptions,
              ...data.invitation.invitationSettings.menuOptions,
            },
          });
        } else {
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error("Failed loading invitation settings", err);
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [invitationId]);

  /* =========================
     Save Invitation Settings
  ========================= */
  const saveSettings = async () => {
    if (!invitationId) return;

    try {
      setSaving(true);

      await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationSettings: settings,
        }),
      });
    } catch (err) {
      console.error("Failed saving invitation settings", err);
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
        טוען הגדרות...
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
          pointer-events-none
          absolute
          -right-28
          -bottom-28
          h-72
          w-72
          rounded-full
          bg-[#B8844F]/14
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
          ⚙️ הגדרות הזמנה
        </div>

        <h2 className="text-2xl font-black tracking-tight text-[#241A14]">
          הגדרות אישור הגעה
        </h2>

        <p className="mt-2 max-w-[720px] text-sm font-semibold leading-relaxed text-[#8A7B69]">
          בחרי אילו אפשרויות יוצגו לאורחים בזמן אישור ההגעה.
        </p>
      </div>

      <div className="relative z-10 px-7 py-6">
        <div
          className="
            mb-5
            rounded-[26px]
            border
            border-[#EFE4D6]
            bg-white/75
            p-5
            shadow-[0_10px_30px_rgba(91,63,31,0.06)]
          "
        >
          <h3 className="text-lg font-black text-[#241A14]">
            הגדרת הערות לאורחים
          </h3>

          <p className="mt-1 text-sm font-semibold text-[#8A7B69]">
            האפשרויות הפעילות יופיעו לאורחים בטופס אישור ההגעה.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(settings.menuOptions).map(([key, value]) => {
            const typedKey = key as keyof MenuOptions;

            return (
              <div
                key={key}
                className={`
                  rounded-[26px]
                  border
                  p-5
                  transition
                  ${
                    value
                      ? "border-[#D9B46F] bg-[#FFF9EF] shadow-[0_14px_36px_rgba(184,132,79,0.13)]"
                      : "border-[#EFE4D6] bg-white/82 shadow-[0_10px_26px_rgba(91,63,31,0.055)]"
                  }
                `}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-[#241A14]">
                      {MENU_LABELS[typedKey]}
                    </h4>

                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#8A7B69]">
                      {MENU_DESCRIPTIONS[typedKey]}
                    </p>
                  </div>

                  <Toggle
                    label={MENU_LABELS[typedKey]}
                    value={value}
                    onChange={(val) =>
                      setSettings({
                        ...settings,
                        menuOptions: {
                          ...settings.menuOptions,
                          [typedKey]: val,
                        },
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="
          relative
          z-10
          flex
          flex-col
          gap-3
          border-t
          border-[#EFE4D6]
          bg-[#FCFAF6]
          px-7
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <p className="text-sm font-bold text-[#8A7B69]">
          השינויים יישמרו בהגדרות ההזמנה הקיימות.
        </p>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="
            h-[50px]
            min-w-[170px]
            rounded-2xl
            bg-gradient-to-l
            from-[#B8844F]
            via-[#D4A762]
            to-[#E7C98D]
            px-8
            text-sm
            font-black
            text-white
            shadow-[0_14px_30px_rgba(184,132,79,0.30)]
            transition
            hover:-translate-y-0.5
            hover:shadow-[0_18px_38px_rgba(184,132,79,0.38)]
            disabled:cursor-not-allowed
            disabled:opacity-55
          "
        >
          {saving ? "שומר..." : "שמירה"}
        </button>
      </div>
    </div>
  );
}

/* =========================
   Toggle
========================= */

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`
        relative
        h-7
        w-14
        shrink-0
        rounded-full
        border
        transition
        ${
          value
            ? "border-[#B8844F] bg-[#B8844F] shadow-[0_8px_18px_rgba(184,132,79,0.28)]"
            : "border-[#D8D2C9] bg-[#E8E2DA]"
        }
      `}
    >
      <span
        className={`
          absolute
          top-1
          h-5
          w-5
          rounded-full
          bg-white
          shadow-md
          transition-all
          ${value ? "right-[29px]" : "right-1"}
        `}
      />
    </button>
  );
}