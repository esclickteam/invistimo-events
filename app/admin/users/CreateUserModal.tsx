"use client";

import { useState } from "react";

/* =========================
   TYPES
========================= */
type UserRole = "user" | "producer" | "staff";

type Props = {
  onClose: () => void;
};

/* =========================
   COMPONENT
========================= */
export default function CreateUserModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  // לקוח בלבד
  const [plan, setPlan] = useState<"basic" | "premium">("basic");
  const [guests, setGuests] = useState<number>(100);
  const [messages, setMessages] = useState<number>(500);
  const [isPaid, setIsPaid] = useState<boolean>(false);

  /* =========================
     SUBMIT (FRONT ONLY)
  ========================= */
  function handleSubmit() {
    const payload = {
      email,
      role,
      plan: role === "user" ? plan : null,
      limits:
        role === "user"
          ? {
              guests,
              messages,
            }
          : null,
      isPaid,
    };

    console.log("CREATE USER PAYLOAD:", payload);

    // 🔒 כרגע רק פרונט
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-black text-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-6 text-right">
          יצירת משתמש חדש
        </h2>

        {/* ================= EMAIL ================= */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {/* ================= ROLE ================= */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">סוג משתמש</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="user">לקוח</option>
            <option value="producer">מפיק</option>
            <option value="staff">עובד</option>
          </select>
        </div>

        {/* ================= CLIENT OPTIONS ================= */}
        {role === "user" && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">חבילה</label>
              <select
                value={plan}
                onChange={(e) =>
                  setPlan(e.target.value as "basic" | "premium")
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="basic">בסיס</option>
                <option value="premium">פרימיום</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  כמות אורחים
                </label>
                <input
                  type="number"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  כמות הודעות
                </label>
                <input
                  type="number"
                  value={messages}
                  onChange={(e) => setMessages(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
              />
              <span className="text-sm">שולם</span>
            </div>
          </>
        )}

        {/* ================= ACTIONS ================= */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={!email}
            className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-40"
          >
            צור משתמש
          </button>
        </div>
      </div>
    </div>
  );
}
