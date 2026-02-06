"use client";

import { useState } from "react";

type UserRole = "user" | "producer" | "staff";
type PaymentStatus = "paid" | "stripe";

type Props = {
  onClose: () => void;
};

export default function CreateUserModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  /* USER */
  const [guests, setGuests] = useState(100);
  const [maxMessages, setMaxMessages] = useState(500);
  const [includeCalls, setIncludeCalls] = useState(false);

  /* USER BILLING */
  const [price, setPrice] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("stripe");

  /* PRODUCER BILLING */
  const [producerPricePerRecord, setProducerPricePerRecord] =
    useState<number | "">("");

  function handleSubmit() {
    const payload =
      role === "producer"
        ? {
            email,
            role,
            billing: {
              pricePerRecord: producerPricePerRecord,
            },
          }
        : {
            email,
            role,
            limits: {
              guests,
              maxMessages,
              includeCalls,
            },
            billing: {
              price,
              paymentStatus,
            },
          };

    console.log("CREATE USER:", payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border max-h-[90vh] flex flex-col">
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

        {/* BODY */}
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* USER INFO */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-600">פרטי משתמש</h3>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />

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

          {/* USER */}
          {role === "user" && (
            <>
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  מגבלות
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={guests}
                    onChange={(e) =>
                      setGuests(Number(e.target.value))
                    }
                    className="border rounded-lg px-4 py-2"
                    placeholder="כמות אורחים"
                  />
                  <input
                    type="number"
                    value={maxMessages}
                    onChange={(e) =>
                      setMaxMessages(Number(e.target.value))
                    }
                    className="border rounded-lg px-4 py-2"
                    placeholder="כמות SMS"
                  />
                </div>
              </section>

              <section>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeCalls}
                    onChange={(e) =>
                      setIncludeCalls(e.target.checked)
                    }
                  />
                  שירות שיחות
                </label>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  תשלום
                </h3>
                <input
                  type="number"
                  placeholder="מחיר כולל (₪)"
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(
                      e.target.value as PaymentStatus
                    )
                  }
                  className="w-full border rounded-lg px-4 py-2"
                >
                  <option value="stripe">לתשלום ב-Stripe</option>
                  <option value="paid">שולם ידנית</option>
                </select>
              </section>
            </>
          )}

          {/* PRODUCER */}
          {role === "producer" && (
            <section>
              <h3 className="text-sm font-bold text-gray-600 mb-3">
                תמחור למפיק
              </h3>
              <input
                type="number"
                placeholder="מחיר לרשומה (₪)"
                value={producerPricePerRecord}
                onChange={(e) =>
                  setProducerPricePerRecord(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="w-full border rounded-lg px-4 py-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                החיוב יתבצע לפי מספר הרשומות שהמפיק ייצור בפועל
              </p>
            </section>
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
            onClick={handleSubmit}
            disabled={
              !email ||
              (role === "user" && !price) ||
              (role === "producer" && !producerPricePerRecord)
            }
            className="px-5 py-2 rounded-lg bg-black text-white disabled:opacity-40"
          >
            צור משתמש
          </button>
        </div>
      </div>
    </div>
  );
}
