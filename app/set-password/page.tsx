"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type ApiUser = {
  _id: string;
  name?: string;
  email: string;
  role: "admin" | "user" | "producer" | "client";
  hasPaid: boolean; // הוספת המאפיין הזה
};

export default function SetPasswordPage() {
  const router = useRouter();
  const { setUser, setIsAuthenticated, refreshUser } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
    Get token from URL
  ========================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (!tokenFromUrl) {
      setMessage("הקישור אינו תקף או חסר טוקן");
      return;
    }

    setToken(tokenFromUrl);
  }, []);

  /* =========================
    Submit
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!token) {
    setMessage("הקישור אינו תקף או שפג תוקפו");
    return;
  }

  if (!password || !confirmPassword) {
    setMessage("אנא מלא את כל השדות");
    return;
  }

  if (password.length < 6) {
    setMessage("הסיסמה חייבת להכיל לפחות 6 תווים");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("הסיסמאות אינן תואמות");
    return;
  }

  try {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // ⭐ חשוב לקוקי auth
      body: JSON.stringify({
        token,
        password,
      }),
    });

    const data: {
      success?: boolean;
      message?: string;
      user?: ApiUser;
      redirectTo?: string;
    } = await res.json();

    if (!res.ok || !data?.success) {
      setMessage(data?.message || "אירעה שגיאה");
      return;
    }

    // ⭐ עדכון מיידי של ה-auth state (מונע צורך בריענון ידני)
    if (data.user) {
      setUser(data.user as any);
      setIsAuthenticated(true);
    } else {
      // fallback אם user לא חזר מסיבה כלשהי
      const me = await refreshUser();
      if (me) setIsAuthenticated(true);
    }

    setMessage("הסיסמה הוגדרה בהצלחה 🎉 מעביר לדשבורד...");

    // ניקוי שדות
    setPassword("");
     setConfirmPassword("");

    // לוגים למעקב אחרי המשתמש
    console.log('User data after password set:', data?.user);
    console.log('User hasPaid status:', data?.user?.hasPaid);

    // ריענון המידע על ה-token לאחר יצירת הסיסמה
    router.refresh();  // זה מבצע ריענון של הדף עם הנתונים המעודכנים

    // בדיקה אם המשתמש שילם, הפנייה לדשבורד המתאים
    if (data?.user?.hasPaid) {
      // אם המשתמש שילם, הפנה לדשבורד המתאים
      console.log('Redirecting user to dashboard:', data.user.role); // לוג של ה-role
      if (data.user.role === "admin") {
        router.replace("/admin");
      } else if (data.user.role === "producer") {
        router.replace("/producer/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } else {
      // אם הוא לא שילם, הפנה לעמוד חבילות
      const nextPath = data.redirectTo || "/pricing";
      console.log('Redirecting to pricing page:', nextPath); // לוג אם המשתמש לא שילם
      router.replace(nextPath);
    }
  } catch (err) {
    console.error("❌ set-password frontend error:", err);
    setMessage("שגיאת רשת, נסה שוב");
  } finally {
    setLoading(false);
  }
};

  /* =========================
    UI
  ========================= */
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md text-right">
        <h1 className="text-2xl font-bold mb-6 text-center">הגדרת סיסמה</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !token}
            className="w-full border rounded-lg p-2"
          />

          <input
            type="password"
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || !token}
            className="w-full border rounded-lg p-2"
          />

          <button
            type="submit"
            disabled={loading || !token}
            className={`w-full py-2 rounded-lg text-white transition ${
              loading || !token
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
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
