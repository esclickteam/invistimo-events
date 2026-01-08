"use client";

import { useState } from "react";
import { RSVP_LABELS } from "@/lib/rsvp";
import { useSeatingStore } from "@/store/seatingStore";

type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  relation?: string;
  tableName?: string;
  rsvp: "yes" | "no" | "pending";
  guestsCount: number;
  arrivedCount?: number;
  notes?: string;
};

interface Props {
  onClose: () => void;
  onSuccess: (guest?: Guest) => Promise<void>; // ⬅️ מאפשר אופציונלי
  invitationId?: string;
}

export default function AddGuestModal({
  onClose,
  onSuccess,
  invitationId,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [rsvp, setRsvp] =
    useState<"yes" | "no" | "pending">("pending");
  const [guestsCount, setGuestsCount] = useState(1);
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const demoMode = useSeatingStore((s) => s.demoMode);

  const ensureInvitation = async (): Promise<string> => {
    if (invitationId) return invitationId;

    const res = await fetch("/api/invitations/my", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });

    const data = await res.json();
    if (!data?.success) {
      throw new Error("Failed to create invitation");
    }

    return data.invitation._id;
  };

  const save = async () => {
    if (!name || !phone) {
      alert("יש למלא שם וטלפון");
      return;
    }

    // 🧪 DEMO MODE – הוספה לפרונט בלבד
    if (demoMode) {
      const demoGuest = {
        _id: crypto.randomUUID(),
        name,
        phone,
        token: "demo-token",
        relation,
        rsvp,
        guestsCount,
        tableName: tableNumber
          ? `שולחן ${tableNumber}`
          : undefined,
      };

      await onSuccess(demoGuest); // 🔥 מתעדכן בדשבורד בזמן אמת
      onClose();
      return; // ⛔ לא מגיע ל־API
    }

    // 🚀 PRODUCTION – נשאר בדיוק כמו שהיה
    try {
      setLoading(true);

      const finalInvitationId = await ensureInvitation();

      const res = await fetch(
        `/api/invitations/${finalInvitationId}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name,
            phone,
            relation,
            rsvp,
            guestsCount,
            tableNumber: tableNumber
              ? Number(tableNumber)
              : undefined,
          }),
        }
      );

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "שגיאה בשמירה");
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "שגיאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div
        className="bg-white p-6 rounded-xl w-[420px]"
        dir="rtl"
      >
        <h2 className="text-xl font-semibold mb-4">
          הוספת מוזמן
        </h2>

        {demoMode && (
          <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            🟡 מצב דמו – המוזמן נוסף לצפייה בלבד.<br />
            להוספת מוזמנים אמיתית, הצטרפו אלינו 🌟
          </div>
        )}

        <input
          className="border w-full rounded px-3 py-2 mb-3"
          placeholder="שם מלא"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border w-full rounded px-3 py-2 mb-3"
          placeholder="טלפון"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className="border w-full rounded px-3 py-2 mb-3"
          placeholder="קרבה"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />

        <select
          className="border w-full rounded px-3 py-2 mb-3"
          value={rsvp}
          onChange={(e) =>
            setRsvp(e.target.value as any)
          }
        >
          <option value="yes">{RSVP_LABELS.yes}</option>
          <option value="no">{RSVP_LABELS.no}</option>
          <option value="pending">
            {RSVP_LABELS.pending}
          </option>
        </select>

        

        <div className="flex items-center justify-between gap-3 mb-3">
  <label className="text-sm font-medium text-gray-700">
    כמות אורחים
  </label>

  <input
    type="number"
    min={1}
    max={20}
    value={guestsCount}
    onChange={(e) =>
      setGuestsCount(Math.max(1, Number(e.target.value)))
    }
    className="w-20 text-center border rounded-lg px-2 py-1"
  />
</div>

        <input
          type="number"
          className="border w-full rounded px-3 py-2 mb-4"
          placeholder="מס׳ שולחן (אופציונלי)"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            ביטול
          </button>

          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded"
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
