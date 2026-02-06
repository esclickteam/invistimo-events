"use client";

import { useState } from "react";

type UserRole = "user" | "producer" | "staff";
type PlanType = "basic" | "premium" | "custom";
type PaymentStatus = "paid" | "unpaid";

type Props = {
  onClose: () => void;
};

export default function CreateUserModal({ onClose }: Props) {
  /* ================= USER ================= */
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  /* ================= PLAN ================= */
  const [plan, setPlan] = useState<PlanType>("basic");
  const [guests, setGuests] = useState(100);
  const [maxMessages, setMaxMessages] = useState(500);

  /* ================= PAYMENT ================= */
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("paid");
  const [paidAmount, setPaidAmount] = useState<number | "">("");

  function handleSubmit() {
    const payload = {
      email,
      role,

      plan: role === "user" ? plan : null,

      limits:
        role === "user"
          ? {
              guests,
              maxMessages,
            }
          : null,

      payment: {
        status: paymentStatus,
        paidAmount:
          paymentStatus === "paid" ? Number(paidAmount) : 0,
      },
    };

    console.log("ADMIN CREATE USER:", payload);

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            יצירת משתמש חדש (Admin)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* ================= USER ================= */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">
              פרטי משתמש
            </h3>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="אימייל משתמש"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />

              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as UserRole)
                }
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="user">לקוח</option>
                <option value="producer">מפיק</option>
                <option value="staff">עובד</option>
              </select>
            </div>
          </section>

          {/* ================= PLAN ================= */}
          {role === "user" && (
            <section>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">
                חבילת שירות
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  value={plan}
                  onChange={(e) =>
                    setPlan(e.target.value as PlanType)
                  }
                  className="border rounded-md px-3 py-2"
                >
                  <option value="basic">בסיס</option>
                  <option value="premium">פרימיום</option>
                  <option value="custom">מותאמת אישית</option>
                </select>

                <input
                  type="number"
                  placeholder="כמות אורחים"
                  value={guests}
                  onChange={(e) =>
                    setGuests(Number(e.target.value))
                  }
                  className="border rounded-md px-3 py-2"
                />
              </div>

              <input
                type="number"
                placeholder="כמות הודעות SMS"
                value={maxMessages}
                onChange={(e) =>
                  setMaxMessages(Number(e.target.value))
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </section>
          )}

          {/* ================= PAYMENT ================= */}
          {role === "user" && (
            <section>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">
                תשלום
              </h3>

              <select
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(
                    e.target.value as PaymentStatus
                  )
                }
                className="w-full border rounded-md px-3 py-2 mb-3"
              >
                <option value="paid">שולם ידנית</option>
                <option value="unpaid">
                  טרם שולם – יצירת קישור תשלום
                </option>
              </select>

              {paymentStatus === "paid" && (
                <input
                  type="number"
                  placeholder="סכום ששולם"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full border rounded-md px-3 py-2"
                />
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md"
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={!email}
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-40"
          >
            צור משתמש
          </button>
        </div>
      </div>
    </div>
  );
}
