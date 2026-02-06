"use client";

import { useState } from "react";

type UserRole = "user" | "producer" | "staff";
type PlanType = "basic" | "premium" | "custom";
type PaymentStatus = "paid" | "unpaid";

type Props = {
  onClose: () => void;
};

export default function CreateUserModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  const [plan, setPlan] = useState<PlanType>("basic");
  const [guests, setGuests] = useState(100);
  const [maxMessages, setMaxMessages] = useState(500);
  const [includeCalls, setIncludeCalls] = useState(false);

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("unpaid");
  const [paidAmount, setPaidAmount] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div
        className="
          w-full max-w-2xl
          bg-white rounded-xl shadow-2xl border
          max-h-[90vh] flex flex-col
        "
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">יצירת משתמש חדש</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black text-xl"
          >
            ✕
          </button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* USER */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-600">
              פרטי משתמש
            </h3>
            <input
              type="email"
              placeholder="אימייל משתמש"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />
          </section>

          {/* ROLE */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-600">
              סוג משתמש
            </h3>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="user">לקוח</option>
              <option value="producer">מפיק</option>
              <option value="staff">עובד</option>
            </select>
          </section>

          {/* USER ONLY */}
          {role === "user" && (
            <>
              {/* PLAN */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-600">
                  חבילת שירות
                </h3>
                <select
                  value={plan}
                  onChange={(e) =>
                    setPlan(e.target.value as PlanType)
                  }
                  className="w-full border rounded-lg px-4 py-2"
                >
                  <option value="basic">בסיס</option>
                  <option value="premium">פרימיום</option>
                  <option value="custom">מותאמת אישית</option>
                </select>
              </section>

              {/* LIMITS */}
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  מגבלות
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      כמות אורחים
                    </label>
                    <input
                      type="number"
                      value={guests}
                      onChange={(e) =>
                        setGuests(Number(e.target.value))
                      }
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      כמות הודעות SMS
                    </label>
                    <input
                      type="number"
                      value={maxMessages}
                      onChange={(e) =>
                        setMaxMessages(Number(e.target.value))
                      }
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              </section>

              {/* SERVICES */}
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  שירותים
                </h3>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeCalls}
                    onChange={(e) =>
                      setIncludeCalls(e.target.checked)
                    }
                  />
                  <span>שירות שיחות</span>
                </label>
              </section>

              {/* PAYMENT */}
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  תשלום
                </h3>
                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(
                      e.target.value as PaymentStatus
                    )
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                >
                  <option value="unpaid">לא שולם</option>
                  <option value="paid">שולם ידנית</option>
                </select>

                {paymentStatus === "paid" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      סכום ששולם
                    </label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) =>
                        setPaidAmount(e.target.value)
                      }
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            ביטול
          </button>
          <button
            disabled={!email}
            className="px-5 py-2 rounded-lg bg-black text-white disabled:opacity-40"
          >
            צור משתמש
          </button>
        </div>
      </div>
    </div>
  );
}
