"use client";

import { useMemo, useState } from "react";
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

type EnsureInvitationResponse = {
  success?: boolean;
  invitation?: { _id: string };
  error?: string;
};

type AddGuestApiSuccess = {
  success: true;
  guest: Guest;
};

type AddGuestApiError = {
  success?: false;
  error?: string;
  code?: string;
  limit?: number;
  currentTotal?: number;
  importTotal?: number; // אצל add בודד ייתכן שיגיע כך
  requestedTotal?: number;
};

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";

  // אם כבר עם 0 מוביל
  if (digits.startsWith("0")) return digits;

  // ישראלי סלולרי בלי 0 (לרוב 9 ספרות שמתחיל ב-5)
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }

  return digits;
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

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      normalizePhone(phone).length > 0 &&
      guestsCount >= 1 &&
      !loading
    );
  }, [name, phone, guestsCount, loading]);

  const ensureInvitation = async (): Promise<string> => {
    if (invitationId) return invitationId;

    const res = await fetch("/api/invitations/my", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });

    const data: EnsureInvitationResponse = await res.json();

    if (!res.ok || !data?.success || !data?.invitation?._id) {
      throw new Error(data?.error || "כדי להוסיף מוזמנים יש ליצור הזמנה תחילה");
    }

    return data.invitation._id;
  };

  const showPlanLimitAlert = (payload: AddGuestApiError) => {
    const limit = Number(payload?.limit ?? 0);
    const currentTotal = Number(payload?.currentTotal ?? 0);
    const requestedTotal = Number(
      payload?.requestedTotal ?? currentTotal + Number(guestsCount || 0)
    );
    const toAdd = Math.max(0, requestedTotal - currentTotal);
    const remaining = Math.max(0, limit - currentTotal);

    alert(
      `אי אפשר להוסיף את המוזמן כי זה חורג ממכסת החבילה.\n\n` +
        `מכסה: ${limit}\n` +
        `קיים כרגע: ${currentTotal}\n` +
        `ניסיון להוסיף: ${toAdd}\n` +
        `סה״כ לאחר הוספה: ${requestedTotal}\n` +
        `מקום פנוי כרגע: ${remaining}\n\n` +
        `מה אפשר לעשות:\n` +
        `• להקטין את "כמות אורחים"\n` +
        `• למחוק רשומות קיימות\n` +
        `• לשדרג חבילה`
    );
  };

  const save = async () => {
    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);

    if (!cleanName || !cleanPhone) {
      alert("יש למלא שם וטלפון");
      return;
    }

    if (!Number.isFinite(guestsCount) || guestsCount < 1) {
      alert("כמות אורחים חייבת להיות לפחות 1");
      return;
    }

    // 🧪 DEMO MODE
    if (demoMode) {
      const demoGuest: Guest = {
        _id: crypto.randomUUID(),
        name: cleanName,
        phone: cleanPhone,
        token: "demo-token",
        relation: relation || undefined,
        rsvp: "pending",
        guestsCount,
        arrivedCount: 0,
      };

      await onSuccess(demoGuest);
      onClose();
      return;
    }

    try {
      setLoading(true);
      const finalInvitationId = await ensureInvitation();

      const res = await fetch(`/api/invitations/${finalInvitationId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          relation: relation || null,
          rsvp: "pending",
          guestsCount,
          arrivedCount: 0,
        }),
      });

      const data: AddGuestApiSuccess | AddGuestApiError = await res.json();

      if (res.ok && (data as AddGuestApiSuccess)?.success) {
        await onSuccess((data as AddGuestApiSuccess).guest);
        onClose();
        return;
      }

      // ✅ טיפול ייעודי בחריגת חבילה
      if (
        res.status === 409 &&
        ((data as AddGuestApiError)?.code === "PLAN_GUEST_LIMIT_EXCEEDED" ||
          (data as AddGuestApiError)?.error === "PLAN_GUEST_LIMIT_EXCEEDED")
      ) {
        showPlanLimitAlert(data as AddGuestApiError);
        return;
      }

      throw new Error(
        (data as AddGuestApiError)?.error || "שגיאה בהוספת מוזמן"
      );
    } catch (err: any) {
      alert(err?.message || "שגיאה");
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
        <h2 className="text-xl font-semibold mb-6 text-gray-900">הוספת מוזמן</h2>

        {demoMode && (
          <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            🟡 מצב דמו – המוזמן נוסף לצפייה בלבד.
          </div>
        )}

        {/* ===== פרטי המוזמן ===== */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">פרטי המוזמן</h3>

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
          <h3 className="text-sm font-semibold text-gray-500 mb-2">פרטי הגעה</h3>

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
              <span className="text-xs text-gray-500 mb-1 text-center">כמות אורחים</span>

              <select
                className="rounded-lg border border-gray-200 bg-white text-center px-2 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
          >
            ביטול
          </button>

          <button
            onClick={save}
            disabled={!canSave}
            className="px-6 py-2 rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-60"
          >
            {loading ? "שומר..." : "הוסף מוזמן"}
          </button>
        </div>
      </div>
    </div>
  );
}
