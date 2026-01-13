"use client";
import { useState, useEffect } from "react";

export default function SetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setMessage("אנא מלא את שני השדות");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);
    setMessage(data.message);

    if (data.success) {
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">הגדרת סיסמה</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg p-2 text-right"
          />
          <input
            type="password"
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded-lg p-2 text-right"
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white ${
              loading ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "שומר..." : "שמור סיסמה"}
          </button>
        </form>
        {message && (
          <p className="text-center mt-4 text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}
