"use client";

import { useEffect, useState } from "react";

type MenuOptions = {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  childrenMeal: boolean;
  kosher: boolean;
  kosherGlatt: boolean;
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
  transportation: "הסעות",
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
          setSettings(data.invitation.invitationSettings);
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
    return <div className="text-center py-6">טוען הגדרות...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-6" dir="rtl">
      <h2 className="text-xl font-semibold">⚙️ הגדרות הזמנה</h2>


   

      <div className="space-y-3">
        <h3 className="font-medium text-lg">אפשרויות מנה</h3>

        {Object.entries(settings.menuOptions).map(([key, value]) => {
          const typedKey = key as keyof MenuOptions;

          return (
            <Toggle
              key={key}
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
          );
        })}
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full bg-[#C6A87D] hover:bg-[#b89a6f] text-white py-3 rounded-xl transition"
      >
        {saving ? "שומר..." : "שמירה"}
      </button>
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
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition ${
          value ? "bg-[#C6A87D]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
            value ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
