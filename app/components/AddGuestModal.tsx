"use client";

import { useState } from "react";
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
  onSuccess: (guest?: Guest) => Promise<void>;
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
  const [guestsCount, setGuestsCount] = useState(1);
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

    // 🧪 DEMO MODE
    if (demoMode) {
      const demoGuest: Guest = {
  _id: crypto.randomUUID(),
  name,
  phone,
  token: "demo-token",
  relation,
  rsvp: "pending",
  guestsCount,
};

      await onSuccess(demoGuest);
      onClose();
      return;
    }

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
            rsvp: "pending",
            guestsCount,
            
          }),
        }
      );

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "שגיאה בשמירה");
      }

      await onSuccess(data.guest);

      onClose();
    } catch (err: any) {
      alert(err.message || "שגיאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
          className="bg-white w-[560px] max-w-[90vw] rounded-3xl p-8 shadow-2xl"

        dir="rtl"
      >
        {/* Header */}
        <h2 className="text-xl font-semibold mb-6 text-gray-900">

          הוספת מוזמן
        </h2>

        {demoMode && (
          <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            🟡 מצב דמו – המוזמן נוסף לצפייה בלבד.
          </div>
        )}

        {/* ===== פרטי המוזמן ===== */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">
            פרטי המוזמן
          </h3>

          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-black/10"
            placeholder="שם מלא"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
            placeholder="טלפון"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* ===== פרטי הגעה ===== */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">
            פרטי הגעה
          </h3>

          <div className="flex gap-3 items-end">

            {/* קרבה */}
            <select
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            >
              <option value="">בחר קרבה</option>
              <option value="חברים קרובים">חברים קרובים</option>
              <option value="משפחה קרובה">משפחה קרובה</option>
              <option value="משפחה מורחבת">משפחה מורחבת</option>
              <option value="חברים של ההורים">חברים של ההורים</option>
              <option value="חברים רחוקים">חברים רחוקים</option>
            </select>

            {/* כמות אורחים */}
<div className="flex flex-col w-24">
  <span className="text-xs text-gray-500 mb-1 text-center">
    כמות אורחים
  </span>

  <select
    className="rounded-lg border border-gray-200 bg-white text-center px-2 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
    value={guestsCount}
    onChange={(e) =>
      setGuestsCount(Number(e.target.value))
    }
  >
    {Array.from({ length: 20 }, (_, i) => i + 1).map(
      (num) => (
        <option key={num} value={num}>
          {num}
        </option>
      )
    )}
  </select>
</div>



          </div>
         </div>

        

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            ביטול
          </button>

          <button
            onClick={save}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-60"
          >
            {loading ? "שומר..." : "הוסף מוזמן"}
          </button>
        </div>
      </div>
    </div>
  );
}
