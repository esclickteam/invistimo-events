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

type Usage = {
  current: number;
  limit: number;
  remaining: number;
};

type GuestRow = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  guestsCount: number;
};

interface Props {
  onClose: () => void;
  onSuccess: (guest?: Guest) => Promise<void>;
  invitationId?: string;
  usage?: Usage | null;
}

function createRow(): GuestRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    phone: "",
    relation: "",
    guestsCount: 1,
  };
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").trim();
}

export default function AddGuestModal({
  onClose,
  onSuccess,
  invitationId,
  usage,
}: Props) {
  const [rows, setRows] = useState<GuestRow[]>([createRow()]);
  const [loading, setLoading] = useState(false);

  const demoMode = useSeatingStore((s) => s.demoMode);

  const validRows = useMemo(() => {
    return rows
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        phone: cleanPhone(row.phone),
        relation: row.relation.trim(),
        guestsCount: Math.max(1, Number(row.guestsCount) || 1),
      }))
      .filter((row) => row.name && row.phone);
  }, [rows]);

  const limitReached = useMemo(() => {
    if (!usage) return false;
    return Number(usage.remaining ?? 0) <= 0;
  }, [usage]);

  const notEnoughUsage = useMemo(() => {
    if (!usage) return false;
    return validRows.length > Number(usage.remaining ?? 0);
  }, [usage, validRows.length]);

  const ensureInvitation = async (): Promise<string> => {
    if (invitationId) return invitationId;

    const res = await fetch("/api/invitations/my", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });

    const data = await res.json();

    if (!res.ok || !data?.success || !data?.invitation?._id) {
      throw new Error("כדי להוסיף מוזמנים יש ליצור הזמנה תחילה");
    }

    return data.invitation._id;
  };

  const updateRow = (
    rowId: string,
    field: keyof GuestRow,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createRow()]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const save = async () => {
    if (!demoMode && limitReached) {
      alert("הגעת למכסת הרשומות המותרת, לא ניתן להוסיף מוזמנים נוספים.");
      return;
    }

    if (validRows.length === 0) {
      alert("יש למלא לפחות מוזמן אחד עם שם וטלפון.");
      return;
    }

    if (!demoMode && notEnoughUsage) {
      alert(
        `נותרו לך ${usage?.remaining ?? 0} רשומות בלבד, וניסית להוסיף ${
          validRows.length
        } מוזמנים.`
      );
      return;
    }

    if (demoMode) {
      for (const row of validRows) {
        const demoGuest: Guest = {
          _id: crypto.randomUUID(),
          name: row.name,
          phone: row.phone,
          token: "demo-token",
          relation: row.relation || undefined,
          rsvp: "pending",
          guestsCount: row.guestsCount,
        };

        await onSuccess(demoGuest);
      }

      onClose();
      return;
    }

    try {
      setLoading(true);

      const finalInvitationId = await ensureInvitation();
      const createdGuests: Guest[] = [];

      for (const row of validRows) {
        const res = await fetch(`/api/invitations/${finalInvitationId}/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: row.name,
            phone: row.phone,
            relation: row.relation || null,
            rsvp: "pending",
            guestsCount: row.guestsCount,
          }),
        });

        const data = await res.json();

        if (res.status === 409 && data?.code === "GUEST_LIMIT_REACHED") {
          alert(
            data?.error ||
              `הגעת למכסת הרשומות (${data?.usage?.limit ?? "-"}) ולא ניתן להוסיף עוד.`
          );
          return;
        }

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `שגיאה בשמירת המוזמן: ${row.name}`);
        }

        if (data.guest) {
          createdGuests.push(data.guest);
        }
      }

      if (createdGuests.length === 1) {
        await onSuccess(createdGuests[0]);
      } else {
        await onSuccess();
      }

      onClose();
    } catch (err: any) {
      alert(err?.message || "שגיאה בהוספת מוזמנים");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/45
        px-4
        backdrop-blur-[2px]
      "
      dir="rtl"
    >
      <div
        className="
          relative
          w-[980px]
          max-w-[96vw]
          max-h-[92vh]
          overflow-hidden
          rounded-[34px]
          border
          border-[#E3D0B8]
          bg-[#FFFDF9]
          shadow-[0_28px_90px_rgba(36,26,20,0.26)]
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -left-20
            -top-24
            h-56
            w-56
            rounded-full
            bg-[#D9B46F]/25
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            -bottom-24
            h-64
            w-64
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div
                className="
                  mb-2
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[#D9B46F]/45
                  bg-white/70
                  px-4
                  py-1.5
                  text-xs
                  font-black
                  text-[#8B5E34]
                  shadow-sm
                "
              >
                👥 ניהול מוזמנים
              </div>

              <h2 className="text-2xl font-black text-[#241A14]">
                הוספת מוזמנים
              </h2>

              <p className="mt-1 text-sm font-semibold text-[#8A7B69]">
                אפשר להוסיף מוזמן אחד או כמה מוזמנים ביחד, בלי לעבור חלון כל פעם.
              </p>
            </div>

            <button
              type="button"
              onClick={addRow}
              disabled={loading}
              className="
                h-[48px]
                w-fit
                rounded-full
                bg-gradient-to-l
                from-[#B8844F]
                via-[#D4A762]
                to-[#E7C98D]
                px-6
                text-sm
                font-black
                text-white
                shadow-[0_14px_30px_rgba(184,132,79,0.30)]
                transition
                hover:-translate-y-0.5
                hover:shadow-[0_18px_38px_rgba(184,132,79,0.38)]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              + שורה נוספת
            </button>
          </div>

          {demoMode && (
            <div
              className="
                mt-4
                rounded-2xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
                text-sm
                font-bold
                text-amber-800
              "
            >
              🟡 מצב דמו – המוזמנים יתווספו לצפייה בלבד.
            </div>
          )}

          {!demoMode && usage && (
            <div
              className="
                mt-4
                rounded-2xl
                border
                border-[#E3D6C3]
                bg-white/75
                px-4
                py-3
                text-sm
                font-bold
                text-[#6B5B4A]
              "
            >
              שימוש ברשומות: <b>{usage.current}</b> / <b>{usage.limit}</b>{" "}
              — נותרו <b>{usage.remaining}</b>
            </div>
          )}

          {!demoMode && limitReached && (
            <div
              className="
                mt-4
                rounded-2xl
                border
                border-rose-200
                bg-rose-50
                px-4
                py-3
                text-sm
                font-bold
                text-rose-700
              "
            >
              הגעת למכסה המותרת. כדי להוסיף מוזמנים נוספים צריך להגדיל חבילה.
            </div>
          )}

          {!demoMode && notEnoughUsage && (
            <div
              className="
                mt-4
                rounded-2xl
                border
                border-rose-200
                bg-rose-50
                px-4
                py-3
                text-sm
                font-bold
                text-rose-700
              "
            >
              אין מספיק רשומות פנויות לכמות המוזמנים שהוספת.
            </div>
          )}
        </div>

        <div className="relative z-10 max-h-[58vh] overflow-y-auto px-7 py-6">
          <div
            className="
              hidden
              grid-cols-[1.35fr_1fr_1fr_120px_48px]
              gap-3
              px-2
              pb-2
              text-xs
              font-black
              text-[#8A7B69]
              md:grid
            "
          >
            <div>שם מלא</div>
            <div>טלפון</div>
            <div>קרבה</div>
            <div className="text-center">כמות</div>
            <div />
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="
                  grid
                  grid-cols-1
                  gap-3
                  rounded-[24px]
                  border
                  border-[#EFE4D6]
                  bg-white
                  p-4
                  shadow-[0_10px_28px_rgba(91,63,31,0.07)]
                  transition
                  hover:border-[#D8C4A5]
                  hover:shadow-[0_14px_34px_rgba(91,63,31,0.10)]
                  md:grid-cols-[1.35fr_1fr_1fr_120px_48px]
                  md:items-center
                "
              >
                <input
                  value={row.name}
                  onChange={(e) => updateRow(row.id, "name", e.target.value)}
                  placeholder={`שם מלא ${index + 1}`}
                  className="
                    h-[48px]
                    rounded-2xl
                    border
                    border-[#E3D6C3]
                    bg-[#FCFAF6]
                    px-4
                    text-sm
                    font-bold
                    text-[#241A14]
                    outline-none
                    transition
                    placeholder:text-[#B0A79D]
                    focus:border-[#B8844F]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#D9B46F]/15
                  "
                  autoFocus={index === 0}
                />

                <input
                  value={row.phone}
                  onChange={(e) => updateRow(row.id, "phone", e.target.value)}
                  placeholder="טלפון"
                  inputMode="numeric"
                  className="
                    h-[48px]
                    rounded-2xl
                    border
                    border-[#E3D6C3]
                    bg-[#FCFAF6]
                    px-4
                    text-sm
                    font-bold
                    text-[#241A14]
                    outline-none
                    transition
                    placeholder:text-[#B0A79D]
                    focus:border-[#B8844F]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#D9B46F]/15
                  "
                />

                <select
                  value={row.relation}
                  onChange={(e) =>
                    updateRow(row.id, "relation", e.target.value)
                  }
                  className="
                    h-[48px]
                    rounded-2xl
                    border
                    border-[#E3D6C3]
                    bg-[#FCFAF6]
                    px-4
                    text-sm
                    font-bold
                    text-[#241A14]
                    outline-none
                    transition
                    focus:border-[#B8844F]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#D9B46F]/15
                  "
                >
                  <option value="">בחר קרבה</option>
                  <option value="חברים קרובים">חברים קרובים</option>
                  <option value="משפחה קרובה">משפחה קרובה</option>
                  <option value="משפחה מורחבת">משפחה מורחבת</option>
                  <option value="חברים של ההורים">חברים של ההורים</option>
                  <option value="חברים רחוקים">חברים רחוקים</option>
                  <option value="עבודה">עבודה</option>
                  <option value="אחר">אחר</option>
                </select>

                <select
                  value={row.guestsCount}
                  onChange={(e) =>
                    updateRow(row.id, "guestsCount", Number(e.target.value))
                  }
                  className="
                    h-[48px]
                    rounded-2xl
                    border
                    border-[#E3D6C3]
                    bg-[#FCFAF6]
                    px-3
                    text-center
                    text-sm
                    font-black
                    text-[#241A14]
                    outline-none
                    transition
                    focus:border-[#B8844F]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#D9B46F]/15
                  "
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1 || loading}
                  className="
                    h-[48px]
                    rounded-2xl
                    border
                    border-rose-100
                    bg-rose-50
                    text-lg
                    font-black
                    text-rose-600
                    transition
                    hover:bg-rose-100
                    disabled:cursor-not-allowed
                    disabled:opacity-35
                  "
                  title="מחיקת שורה"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          className="
            relative
            z-10
            flex
            flex-col-reverse
            gap-4
            border-t
            border-[#EFE4D6]
            bg-[#FCFAF6]
            px-7
            py-5
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div className="text-sm font-bold text-[#8A7B69]">
            מוכנים להוספה:{" "}
            <span className="font-black text-[#241A14]">
              {validRows.length}
            </span>{" "}
            מוזמנים
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                h-[48px]
                rounded-2xl
                bg-white
                px-7
                text-sm
                font-black
                text-[#6B5B4A]
                shadow-sm
                transition
                hover:bg-[#F3EEE7]
                disabled:opacity-60
              "
            >
              ביטול
            </button>

            <button
              type="button"
              onClick={save}
              disabled={
                loading ||
                validRows.length === 0 ||
                (!demoMode && (limitReached || notEnoughUsage))
              }
              className="
                h-[48px]
                rounded-2xl
                bg-[#241A14]
                px-9
                text-sm
                font-black
                text-white
                shadow-[0_12px_28px_rgba(36,26,20,0.24)]
                transition
                hover:bg-[#3A2A21]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading
                ? "שומר..."
                : validRows.length > 1
                  ? "הוספת מוזמנים"
                  : "הוסף מוזמן"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}