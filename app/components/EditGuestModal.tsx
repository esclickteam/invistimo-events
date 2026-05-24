"use client";

import { useEffect, useState } from "react";

interface EditGuestModalProps {
  guest: any;
  userRole: "guest" | "admin";
  onClose: () => void;
  onSuccess: (updatedGuest: any) => void;
}

export default function EditGuestModal({
  guest,
  userRole,
  onClose,
  onSuccess,
}: EditGuestModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [rsvp, setRsvp] = useState<"pending" | "yes" | "no">("pending");
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [arrivedCount, setArrivedCount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const tableName = guest?.tableName ?? "-";

  useEffect(() => {
    if (!guest) return;

    setName(guest.name || "");
    setPhone(guest.phone || "");
    setRelation(guest.relation || "");
    setRsvp(guest.rsvp || "pending");
    setGuestsCount(guest.guestsCount || 1);
    setArrivedCount(
      typeof guest.arrivedCount === "number" ? guest.arrivedCount : 0
    );
    setNotes(guest.notes || "");
  }, [guest]);

  async function save() {
    setLoading(true);

    try {
      const payload = {
        name,
        phone,
        relation,
        rsvp,
        guestsCount: Number(guestsCount),
        arrivedCount: Number(arrivedCount),
        notes,
      };

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("❌ שגיאה בעדכון אורח");
        return;
      }

      const data = await res.json();
      onSuccess(data.guest ?? data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ שגיאת שרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/45
        p-4
        backdrop-blur-[2px]
      "
    >
      <div
        className="
          relative
          flex
          w-full
          max-w-[520px]
          max-h-[88vh]
          flex-col
          overflow-hidden
          rounded-[30px]
          border
          border-[#E5D5BC]
          bg-[#FFFDF8]
          shadow-[0_28px_80px_rgba(36,26,20,0.28)]
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -left-20
            -top-24
            h-48
            w-48
            rounded-full
            bg-[#D9B46F]/20
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            -bottom-24
            h-56
            w-56
            rounded-full
            bg-[#B8844F]/14
            blur-3xl
          "
        />

        {/* ================= HEADER ================= */}
        <div
          className="
            relative
            z-10
            shrink-0
            border-b
            border-[#E9DDC8]
            bg-gradient-to-l
            from-[#FFF5E4]
            via-[#FFFDF8]
            to-white
            px-5
            py-5
          "
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              absolute
              left-5
              top-5
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-[#E2D4C3]
              bg-white
              text-xl
              font-bold
              text-[#5A4635]
              shadow-sm
              transition
              hover:bg-[#FFF4E3]
              disabled:opacity-50
            "
            aria-label="סגירה"
          >
            ×
          </button>

          <div className="flex flex-col items-center justify-center text-center">
            <div
              className="
                mb-2
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-full
                border
                border-[#E3C78D]
                bg-[#FFF7E8]
                px-4
                py-1
                text-[11px]
                font-black
                text-[#9A6A25]
              "
            >
              <span>✦</span>
              <span>עריכת אורח</span>
            </div>

            <h2 className="text-2xl font-black text-[#241A14]">
              {guest?.name || "אורח"}
            </h2>

            <p className="mt-1 text-xs font-bold text-[#7D6B59]">
              עדכון פרטי מוזמן, סטטוס וכמות מגיעים
            </p>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="שם מלא">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם האורח"
              />
            </Field>

            <Field label="טלפון">
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="מספר טלפון"
              />
            </Field>

            <Field label="קרבה">
              <input
                className={inputClass}
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="משפחה / חברים / עבודה..."
              />
            </Field>

            <Field label="סטטוס">
              <select
                className={inputClass}
                value={rsvp}
                onChange={(e) => setRsvp(e.target.value as any)}
              >
                <option value="pending">בהמתנה</option>
                <option value="yes">מגיע</option>
                <option value="no">לא מגיע</option>
              </select>
            </Field>

            <Field label="מוזמנים">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
              />
            </Field>

            <Field label="מגיעים">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={arrivedCount}
                onChange={(e) => setArrivedCount(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field label="מספר שולחן">
              <input
                className={`${inputClass} cursor-not-allowed bg-[#F7F1E8] text-[#7D6B59]`}
                value={tableName}
                readOnly
              />
            </Field>

            <Field label="הערות">
              <textarea
                rows={3}
                className={`${inputClass} min-h-[92px] resize-none py-3`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות פנימיות על האורח..."
              />
            </Field>
          </div>

          <div
            className="
              mt-4
              rounded-[20px]
              border
              border-[#EADBC4]
              bg-[#FFF9EE]
              px-4
              py-3
              text-xs
              font-bold
              leading-5
              text-[#7A6046]
            "
          >
           שימו לב: שינוי סטטוס ל״מגיע״ יעדכן את כמות המגיעים לפי השדה
            “מגיעים”. שינוי ל״לא מגיע״ אמור לאפס את כמות המגיעים לפי השרת.
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div
          className="
            relative
            z-10
            shrink-0
            border-t
            border-[#E9DDC8]
            bg-[#FFFDF8]/95
            px-5
            py-4
            backdrop-blur
          "
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-start">
            <button
              type="button"
              onClick={save}
              disabled={loading}
              className={`
                h-11
                rounded-[16px]
                px-8
                text-sm
                font-black
                transition
                ${
                  loading
                    ? "cursor-wait bg-gray-300 text-gray-500"
                    : "bg-gradient-to-l from-[#241A14] via-[#3B2A1D] to-[#6F4C2B] text-white shadow-[0_12px_24px_rgba(36,26,20,0.22)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(36,26,20,0.3)]"
                }
              `}
            >
              {loading ? "שומר..." : "שמור שינויים"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                h-11
                rounded-[16px]
                border
                border-[#D8C4A5]
                bg-white
                px-8
                text-sm
                font-black
                text-[#5A4635]
                shadow-sm
                transition
                hover:bg-[#FFF4E3]
                disabled:opacity-50
              "
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Helpers
========================= */

const inputClass = `
  w-full
  h-11
  rounded-[16px]
  border
  border-[#D8C4A5]
  bg-white
  px-4
  text-sm
  font-bold
  text-[#241A14]
  shadow-[0_8px_18px_rgba(91,63,31,0.04)]
  outline-none
  transition
  placeholder:text-[#A89C8E]
  focus:border-[#B8844F]
  focus:ring-4
  focus:ring-[#B8844F]/15
`;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black text-[#5A4635]">
        {label}
      </label>

      {children}
    </div>
  );
}