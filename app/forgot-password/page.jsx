"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f3ee]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">איפוס סיסמה</h1>
        <p className="text-sm text-gray-500 mb-6">
          נשלח אליך מייל עם קישור לאיפוס סיסמה
        </p>

        {sent ? (
          <p className="text-green-600 font-medium">
            ✔ אם האימייל קיים במערכת – נשלחה הודעה
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-center"
            />

            <button
              disabled={loading}
              className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-medium"
            >
              {loading ? "שולח..." : "שלח קישור איפוס"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
