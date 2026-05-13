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

type MenuOptionQuantities = Record<keyof MenuOptions, number>;

type InvitationSettings = {
  showStoryAfterConfirm: boolean;
  showGiftLinkAfterConfirm: boolean;
  allowGuestNote: boolean;
  menuOptions: MenuOptions;

  // כמות מנות / מספר אנשים להסעה
  menuOptionQuantities: MenuOptionQuantities;
};

type Props = {
  invitationId: string;
};

const defaultMenuOptions: MenuOptions = {
  vegetarian: false,
  vegan: false,
  glutenFree: false,
  childrenMeal: false,
  kosher: false,
  kosherGlatt: false,
  kosherMahfoud: false,
  transportation: false,
};

const defaultMenuOptionQuantities: MenuOptionQuantities = {
  vegetarian: 0,
  vegan: 0,
  glutenFree: 0,
  childrenMeal: 0,
  kosher: 0,
  kosherGlatt: 0,
  kosherMahfoud: 0,
  transportation: 0,
};

const defaultSettings: InvitationSettings = {
  showStoryAfterConfirm: false,
  showGiftLinkAfterConfirm: false,
  allowGuestNote: false,
  menuOptions: defaultMenuOptions,
  menuOptionQuantities: defaultMenuOptionQuantities,
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
  vegetarian: "אפשרות לאורחים לבחור מנה צמחונית",
  vegan: "אפשרות לאורחים לבחור מנה טבעונית",
  glutenFree: "אפשרות לאורחים לסמן צורך במנה ללא גלוטן",
  childrenMeal: "אפשרות לסמן כמות מנות ילדים",
  kosher: "אפשרות לסמן מנה כשרה",
  kosherGlatt: "אפשרות לסמן מנה כשר גלאט",
  kosherMahfoud: "אפשרות לסמן מנה כשר מחפוד",
  transportation: "אפשרות לאורחים להצטרף להסעה",
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
          const invitationSettings = data.invitation.invitationSettings;

          setSettings({
            ...defaultSettings,
            ...invitationSettings,

            menuOptions: {
              ...defaultSettings.menuOptions,
              ...invitationSettings.menuOptions,
            },

            menuOptionQuantities: {
              ...defaultSettings.menuOptionQuantities,
              ...invitationSettings.menuOptionQuantities,
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

  const updateMenuOption = (key: keyof MenuOptions, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      menuOptions: {
        ...prev.menuOptions,
        [key]: value,
      },

      menuOptionQuantities: {
        ...prev.menuOptionQuantities,
        [key]: value ? prev.menuOptionQuantities[key] || 0 : 0,
      },
    }));
  };

  const updateQuantity = (key: keyof MenuOptions, value: string) => {
    const nextValue = Math.max(0, Number(value) || 0);

    setSettings((prev) => ({
      ...prev,
      menuOptionQuantities: {
        ...prev.menuOptionQuantities,
        [key]: nextValue,
      },
    }));
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

      {/* Header */}
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
          הגדרות מנות והסעות
        </h2>

        <p className="mt-2 max-w-[720px] text-sm font-semibold leading-relaxed text-[#8A7B69]">
          בחרי אילו אפשרויות יוצגו לאורחים בזמן אישור ההגעה, והגדירי כמות
          מנות או מספר אנשים להסעה לפי הצורך.
        </p>
      </div>

      {/* Body */}
      <div className="relative z-10 px-7 py-6">
        <div className="mb-5 rounded-[26px] border border-[#EFE4D6] bg-white/75 p-5 shadow-[0_10px_30px_rgba(91,63,31,0.06)]">
          <h3 className="text-lg font-black text-[#241A14]">
            אפשרויות שיופיעו לאורחים
          </h3>

          <p className="mt-1 text-sm font-semibold text-[#8A7B69]">
            אפשר להפעיל כל אפשרות בנפרד, וברגע שהיא פעילה ניתן להגדיר לה כמות.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(settings.menuOptions).map(([key, value]) => {
            const typedKey = key as keyof MenuOptions;
            const isTransportation = typedKey === "transportation";

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
                <div className="flex items-start justify-between gap-4">
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
                    onChange={(val) => updateMenuOption(typedKey, val)}
                  />
                </div>

                {value && (
                  <div className="mt-5">
                    <label className="mb-2 block px-1 text-xs font-black text-[#6B5B4A]">
                      {isTransportation
                        ? "מספר אנשים להסעה"
                        : "מספר מנות"}
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={settings.menuOptionQuantities[typedKey] || ""}
                      onChange={(e) =>
                        updateQuantity(typedKey, e.target.value)
                      }
                      placeholder={
                        isTransportation ? "לדוגמה: 45" : "לדוגמה: 12"
                      }
                      className="
                        h-[48px]
                        w-full
                        rounded-2xl
                        border
                        border-[#E3D6C3]
                        bg-white
                        px-4
                        text-sm
                        font-bold
                        text-[#241A14]
                        outline-none
                        transition
                        placeholder:text-[#B0A79D]
                        focus:border-[#B8844F]
                        focus:ring-4
                        focus:ring-[#D9B46F]/15
                      "
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
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
          השינויים יישמרו בהגדרות ההזמנה ויוכלו לשמש את טופס אישור ההגעה.
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