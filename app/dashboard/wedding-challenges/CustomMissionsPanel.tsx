"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from "@/lib/weddingChallenges/constants";
import type {
  CustomMissionTargetingType,
  MissionCategory,
  MissionDefinition,
  MissionDifficulty,
} from "@/lib/weddingChallenges/types";

type GuestOption = {
  id: string;
  name: string;
  tableId: string | null;
  tableNumber: number | null;
};

type CustomMission = MissionDefinition & {
  targeting?: {
    type: CustomMissionTargetingType;
    count?: number;
    tableIds?: string[];
    guestIds?: string[];
  };
  custom?: true;
};

const emptyForm = {
  text: "",
  category: "chaos" as MissionCategory,
  difficulty: "medium" as MissionDifficulty,
  requiresAlcohol: false,
  boss: false,
  minPeople: "",
  tableBased: false,
  active: true,
  weight: 10,
  maxAssignments: "",
  targetingType: "ALL_ELIGIBLE_GUESTS" as CustomMissionTargetingType,
  targetingCount: 10,
  targetingTableIds: [] as string[],
  targetingGuestIds: [] as string[],
};

const TARGETING_LABELS: Record<CustomMissionTargetingType, string> = {
  ALL_ELIGIBLE_GUESTS: "כל האורחים המתאימים",
  RANDOM_GUESTS: "אורחים אקראיים",
  SPECIFIC_TABLES: "שולחנות נבחרים",
  SPECIFIC_GUESTS: "אורחים נבחרים",
};

function missionFromForm(form: typeof emptyForm): CustomMission {
  const category = form.category;
  return {
    id: "preview",
    category,
    text: form.text.trim() || "טקסט המשימה יופיע כאן",
    difficulty: form.difficulty,
    requiresAlcohol: form.requiresAlcohol || category === "shots",
    minPeople: form.minPeople ? Number(form.minPeople) : 2,
    maxPeople: null,
    tableBased: form.tableBased,
    cooldownWeight: form.boss || category === "boss" ? 4 : 1,
    boss: form.boss || category === "boss",
    minTables: 0,
    active: form.active,
    source: "custom",
    weight: form.weight,
    maxAssignments: form.maxAssignments ? Number(form.maxAssignments) : null,
    custom: true,
    targeting: {
      type: form.targetingType,
      count: form.targetingCount,
      tableIds: form.targetingTableIds,
      guestIds: form.targetingGuestIds,
    },
  };
}

export default function CustomMissionsPanel({
  eventId,
  disabled,
  onMessage,
}: {
  eventId: string;
  disabled?: boolean;
  onMessage: (message: string) => void;
}) {
  const [custom, setCustom] = useState<CustomMission[]>([]);
  const [defaults, setDefaults] = useState<Array<{ id: string; category: MissionCategory; text: string }>>([]);
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const [saving, setSaving] = useState(false);

  const tables = useMemo(() => {
    const map = new Map<string, string>();
    for (const guest of guests) {
      const id = String(guest.tableId || guest.tableNumber || "");
      if (!id) continue;
      map.set(id, guest.tableNumber ? `שולחן ${guest.tableNumber}` : `שולחן ${id}`);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [guests]);

  const preview = missionFromForm(form);

  const load = async () => {
    const [missionsRes, guestsRes] = await Promise.all([
      fetch(`/api/wedding-challenges/missions?eventId=${eventId}`, { cache: "no-store" }),
      fetch(`/api/wedding-challenges/guests?eventId=${eventId}`, { cache: "no-store" }),
    ]);
    const missionsJson = await missionsRes.json();
    const guestsJson = await guestsRes.json();
    if (missionsJson?.custom) setCustom(missionsJson.custom);
    if (missionsJson?.defaults) setDefaults(missionsJson.defaults);
    if (guestsJson?.guests) setGuests(guestsJson.guests);
  };

  useEffect(() => {
    load().catch(() => onMessage("לא הצלחנו לטעון משימות"));
  }, [eventId]);

  const startCreate = () => {
    setEditingKey(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (mission: CustomMission) => {
    setEditingKey(mission.id);
    setForm({
      text: mission.text,
      category: mission.category,
      difficulty: mission.difficulty,
      requiresAlcohol: mission.requiresAlcohol,
      boss: mission.boss,
      minPeople: mission.minPeople ? String(mission.minPeople) : "",
      tableBased: mission.tableBased,
      active: mission.active !== false,
      weight: mission.weight || 10,
      maxAssignments: mission.maxAssignments ? String(mission.maxAssignments) : "",
      targetingType: mission.targeting?.type || "ALL_ELIGIBLE_GUESTS",
      targetingCount: mission.targeting?.count || 10,
      targetingTableIds: mission.targeting?.tableIds || [],
      targetingGuestIds: mission.targeting?.guestIds || [],
    });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        eventId,
        missionKey: editingKey,
        text: form.text,
        category: form.category,
        difficulty: form.difficulty,
        requiresAlcohol: form.requiresAlcohol || form.category === "shots",
        boss: form.boss || form.category === "boss",
        minPeople: form.minPeople ? Number(form.minPeople) : 2,
        tableBased: form.tableBased,
        active: form.active,
        weight: form.weight,
        maxAssignments: form.maxAssignments ? Number(form.maxAssignments) : null,
        targetingType: form.targetingType,
        targetingCount: form.targetingCount,
        targetingTableIds: form.targetingTableIds,
        targetingGuestIds: form.targetingGuestIds,
      };
      const res = await fetch("/api/wedding-challenges/missions", {
        method: editingKey ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        onMessage("שמירת המשימה נכשלה");
        return;
      }
      onMessage(editingKey ? "המשימה עודכנה" : "משימה אישית נוספה");
      setShowForm(false);
      setEditingKey(null);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (mission: CustomMission, active: boolean) => {
    const res = await fetch("/api/wedding-challenges/missions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, missionKey: mission.id, active }),
    });
    if (res.ok) {
      onMessage(active ? "המשימה הופעלה" : "המשימה כובתה");
      await load();
    }
  };

  const remove = async (mission: CustomMission) => {
    if (!window.confirm("למחוק את המשימה האישית? אם כבר שובצה לאורחים היא תכובה במקום מחיקה.")) {
      return;
    }
    const res = await fetch(
      `/api/wedding-challenges/missions?eventId=${eventId}&missionKey=${encodeURIComponent(mission.id)}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok) {
      onMessage("מחיקה נכשלה");
      return;
    }
    onMessage(json.disabled ? "המשימה כובתה כי כבר שובצה" : "המשימה נמחקה");
    await load();
  };

  return (
    <section className="mb-6 space-y-3 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">משימות</h2>
        <button
          type="button"
          disabled={disabled}
          onClick={startCreate}
          className="rounded-full bg-[#C89545] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          הוספת משימה אישית
        </button>
      </div>
      <p className="text-sm text-[#7B6754]">
        משימות אישיות נכנסות לאותו מנוע שיבוץ חכם: בלי כפילות לאורח, בלי אותה משימה פעילה באותו שולחן, גיוון קטגוריות, כללי אלכוהול, ועד 5 משימות לאורח.
      </p>

      {custom.length === 0 && !showForm ? (
        <p className="text-sm text-[#7B6754]">אין עדיין משימות אישיות. משימות Invistimo פועלות לפי הקטגוריות למעלה.</p>
      ) : null}

      {custom.map((mission) => (
        <article key={mission.id} className="rounded-2xl border border-[#E7D8C6] bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#FFF3DF] px-3 py-1 text-xs font-black text-[#A86F2B]">
              משימה אישית
            </span>
            <span className="rounded-full bg-[#F4EEE6] px-3 py-1 text-xs font-bold text-[#3A2A1C]">
              {CATEGORY_SHORT_LABELS[mission.category]}
            </span>
            {mission.active === false ? (
              <span className="rounded-full bg-[#F3E8E8] px-3 py-1 text-xs font-bold text-[#8A3B3B]">כבויה</span>
            ) : null}
          </div>
          <p className="font-bold text-[#3A2A1C]">{mission.text}</p>
          <p className="mt-1 text-xs text-[#7B6754]">
            {TARGETING_LABELS[mission.targeting?.type || "ALL_ELIGIBLE_GUESTS"]}
            {mission.maxAssignments ? ` · עד ${mission.maxAssignments} שיבוצים` : ""}
            {` · משקל ${mission.weight || 10}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => startEdit(mission)} className="rounded-full border border-[#E7D8C6] px-3 py-1 text-xs font-bold">
              עריכה
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleActive(mission, mission.active === false)}
              className="rounded-full border border-[#E7D8C6] px-3 py-1 text-xs font-bold"
            >
              {mission.active === false ? "הפעלה" : "כיבוי"}
            </button>
            <button type="button" disabled={disabled} onClick={() => remove(mission)} className="rounded-full border border-[#E7D8C6] px-3 py-1 text-xs font-bold text-[#8A3B3B]">
              מחיקה
            </button>
          </div>
        </article>
      ))}

      {showForm && (
        <div className="space-y-3 rounded-2xl border border-[#C89545] bg-white p-4">
          <h3 className="font-black">{editingKey ? "עריכת משימה אישית" : "הוספת משימה אישית"}</h3>
          <label className="block text-sm font-bold text-[#7B6754]">
            טקסט המשימה
            <textarea
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-[#7B6754]">
              קטגוריה
              <select
                value={form.category}
                onChange={(event) => {
                  const category = event.target.value as MissionCategory;
                  setForm({
                    ...form,
                    category,
                    requiresAlcohol: category === "shots" ? true : form.requiresAlcohol,
                    boss: category === "boss" ? true : form.boss,
                  });
                }}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              >
                {Object.entries(CATEGORY_SHORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-[#7B6754]">
              רמת קושי
              <select
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value as MissionDifficulty })}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              >
                <option value="easy">קל</option>
                <option value="medium">בינוני</option>
                <option value="hard">קשה</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.requiresAlcohol} onChange={(event) => setForm({ ...form, requiresAlcohol: event.target.checked })} />
            דורש אלכוהול
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.boss} onChange={(event) => setForm({ ...form, boss: event.target.checked })} />
            Boss
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.tableBased} onChange={(event) => setForm({ ...form, tableBased: event.target.checked })} />
            מבוסס שולחן
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            פעילה
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-bold text-[#7B6754]">
              מינימום אנשים (אופציונלי)
              <input
                type="number"
                min={1}
                value={form.minPeople}
                onChange={(event) => setForm({ ...form, minPeople: event.target.value })}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-[#7B6754]">
              משקל / נדירות
              <input
                type="number"
                min={1}
                max={100}
                value={form.weight}
                onChange={(event) => setForm({ ...form, weight: Number(event.target.value || 10) })}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-[#7B6754]">
              מקסימום שיבוצים (אופציונלי)
              <input
                type="number"
                min={1}
                value={form.maxAssignments}
                onChange={(event) => setForm({ ...form, maxAssignments: event.target.value })}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
          </div>
          <label className="text-sm font-bold text-[#7B6754]">
            למי לשבץ
            <select
              value={form.targetingType}
              onChange={(event) =>
                setForm({ ...form, targetingType: event.target.value as CustomMissionTargetingType })
              }
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            >
              {Object.entries(TARGETING_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {form.targetingType === "RANDOM_GUESTS" ? (
            <label className="text-sm font-bold text-[#7B6754]">
              כמה אורחים אקראיים
              <input
                type="number"
                min={1}
                value={form.targetingCount}
                onChange={(event) => setForm({ ...form, targetingCount: Number(event.target.value || 1) })}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>
          ) : null}
          {form.targetingType === "SPECIFIC_TABLES" ? (
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[#E7D8C6] p-3">
              {tables.map((table) => (
                <label key={table.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.targetingTableIds.includes(table.id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        targetingTableIds: event.target.checked
                          ? [...form.targetingTableIds, table.id]
                          : form.targetingTableIds.filter((id) => id !== table.id),
                      })
                    }
                  />
                  {table.label}
                </label>
              ))}
            </div>
          ) : null}
          {form.targetingType === "SPECIFIC_GUESTS" ? (
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[#E7D8C6] p-3">
              {guests.map((guest) => (
                <label key={guest.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.targetingGuestIds.includes(guest.id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        targetingGuestIds: event.target.checked
                          ? [...form.targetingGuestIds, guest.id]
                          : form.targetingGuestIds.filter((id) => id !== guest.id),
                      })
                    }
                  />
                  {guest.name}
                </label>
              ))}
            </div>
          ) : null}

          <div className="rounded-2xl bg-[#FFF8EE] p-4">
            <p className="text-xs font-black tracking-wide text-[#A86F2B]">תצוגה לפני שמירה</p>
            <p className="mt-1 text-xs font-bold text-[#A86F2B]">משימה אישית · {CATEGORY_LABELS[preview.category]}</p>
            <p className="mt-2 font-black text-[#3A2A1C]">{preview.text}</p>
            <p className="mt-2 text-xs text-[#7B6754]">
              {preview.difficulty} · {TARGETING_LABELS[form.targetingType]}
              {preview.requiresAlcohol ? " · אלכוהול" : ""}
              {preview.boss ? " · Boss" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || saving || form.text.trim().length < 4}
              onClick={save}
              className="rounded-full bg-[#C89545] px-5 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמירת משימה"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingKey(null);
              }}
              className="rounded-full px-4 py-2 text-sm font-bold text-[#7B6754]"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowDefaults((value) => !value)}
        className="text-sm font-bold text-[#A86F2B]"
      >
        {showDefaults ? "הסתר משימות Invistimo" : `משימות ברירת מחדל של Invistimo (${defaults.length})`}
      </button>
      {showDefaults ? (
        <div className="max-h-80 space-y-2 overflow-auto rounded-2xl border border-[#E7D8C6] bg-white p-3">
          {defaults.map((mission) => (
            <div key={mission.id} className="border-b border-[#F0E6D8] pb-2 last:border-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-[#F4EEE6] px-2 py-0.5 text-[10px] font-black text-[#7B6754]">
                  Invistimo
                </span>
                <span className="text-[10px] font-bold text-[#A86F2B]">
                  {CATEGORY_SHORT_LABELS[mission.category]}
                </span>
              </div>
              <p className="text-sm text-[#3A2A1C]">{mission.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
