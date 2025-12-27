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

    /* ======================================================
       🧪 DEMO MODE – חסימה + הפניה להרשמה
    ====================================================== */
    if (demoMode) {
      const goRegister = window.confirm(
        "להוספת מוזמנים הצטרפו אלינו 🌟\n\nלעבור לעמוד הרשמה?"
      );

      if (goRegister) {
        window.location.href = "/register";
      }

      return; // ⛔ לא ממשיך לשום לוגיקה אחרת
    }

    /* ======================================================
       🚀 PRODUCTION – נשאר בדיוק כמו שהיה
    ====================================================== */
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
      <div className="bg-white p-6 rounded-xl w-[420px]" dir="rtl">
        <h2 className="text-xl font-semibold mb-4">
          הוספת מוזמן
        </h2>

        {demoMode && (
          <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            🟡 מצב דמו – לא ניתן להוסיף מוזמנים.<br />
            לחצו על שמירה כדי להצטרף 🚀
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

        <input
          type="number"
          min={1}
          className="border w-full rounded px-3 py-2 mb-3"
          placeholder="כמות מוזמנים"
          value={guestsCount}
          onChange={(e) =>
            setGuestsCount(Number(e.target.value))
          }
        />

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
