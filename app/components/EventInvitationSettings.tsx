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
  eventId: string;
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

export default function EventInvitationSettings({ eventId }: Props) {
  const [settings, setSettings] = useState<InvitationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =========================
     Fetch Settings
  ========================= */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        setSettings(data.invitationSettings);
      } catch (err) {
        console.error("Failed loading settings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [eventId]);

  /* =========================
     Save Settings
  ========================= */
  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      await fetch(`/api/events/${eventId}/invitation-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

    } catch (err) {
      console.error("Failed saving settings", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-6">טוען הגדרות...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-6" dir="rtl">
      <h2 className="text-xl font-semibold">⚙️ הגדרות הזמנה</h2>

      {/* Story Toggle */}
      <Toggle
        label="הצג סיפור לאחר אישור"
        value={settings.showStoryAfterConfirm}
        onChange={(val) =>
          setSettings({ ...settings, showStoryAfterConfirm: val })
        }
      />

      {/* Gift Toggle */}
      <Toggle
        label="הצג קישור מתנה לאחר אישור"
        value={settings.showGiftLinkAfterConfirm}
        onChange={(val) =>
          setSettings({ ...settings, showGiftLinkAfterConfirm: val })
        }
      />

      {/* Guest Note */}
      <Toggle
        label="אפשר הערת אורח"
        value={settings.allowGuestNote}
        onChange={(val) =>
          setSettings({ ...settings, allowGuestNote: val })
        }
      />

      {/* Menu Options */}
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

      {/* Save Button */}
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
   Toggle Component
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
