"use client";

import { useEffect, useState } from "react";

/* =========================
   TYPES
========================= */
type AdminUser = {
  _id: string;
  name?: string;
  email: string;
  role: "admin" | "user";
  plan?: "basic" | "premium";
  includeCalls?: boolean;
  callsRounds?: number;
  createdAt?: string;
};

/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  /* =========================
     Load users
  ========================= */
  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Toggle calls service
  ========================= */
  async function toggleCalls(userId: string, enable: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}/calls`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeCalls: enable,
          callsRounds: enable ? 3 : 0,
        }),
      });

      loadUsers();
    } catch (err) {
      console.error("Toggle calls error:", err);
    }
  }

  /* =========================
     Impersonate user
  ========================= */
  async function impersonateUser(userId: string) {
    try {
      setImpersonating(userId);

      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error("Impersonation failed");
      }

      // מעבר לדשבורד של הלקוח
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Impersonate error:", err);
      alert("לא הצלחנו להיכנס כמשתמש");
      setImpersonating(null);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return <div className="text-gray-500">טוען משתמשים…</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6">ניהול משתמשים</h1>

      <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
        <table className="min-w-full text-right">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="p-3">שם</th>
              <th className="p-3">אימייל</th>
              <th className="p-3">תפקיד</th>
              <th className="p-3">חבילה</th>
              <th className="p-3">שירות שיחות</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t text-sm">
                <td className="p-3">{u.name || "-"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 font-semibold">{u.role}</td>
                <td className="p-3">{u.plan || "-"}</td>

                <td className="p-3">
                  {u.includeCalls ? (
                    <span className="inline-flex items-center gap-2 text-green-600 font-medium">
                      ☎️ פעיל ({u.callsRounds || 0})
                    </span>
                  ) : (
                    <span className="text-gray-400">לא פעיל</span>
                  )}
                </td>

                <td className="p-3 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      toggleCalls(u._id, !u.includeCalls)
                    }
                    className="px-4 py-2 rounded-full bg-black text-white text-xs hover:opacity-90"
                  >
                    {u.includeCalls ? "כבה שיחות" : "הפעל שיחות"}
                  </button>

                  {u.role === "user" && (
                    <button
                      onClick={() => impersonateUser(u._id)}
                      disabled={impersonating === u._id}
                      className="px-4 py-2 rounded-full bg-blue-600 text-white text-xs hover:opacity-90 disabled:opacity-50"
                    >
                      {impersonating === u._id
                        ? "נכנס…"
                        : "כניסה כמשתמש"}
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-gray-500"
                >
                  לא נמצאו משתמשים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
