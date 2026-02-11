"use client";

import React, { useEffect, useState } from "react";
import CreateUserModal from "./CreateUserModal";

/* =========================
   TYPES
========================= */
type AdminUser = {
  _id: string;
  name?: string;
  email: string;
  role: "admin" | "user" | "producer" | "staff";
  plan?: "basic" | "premium";
  includeCalls?: boolean;
  callsRounds?: number;
  createdAt?: string;
  eventDate?: string;

  // 🔽 מטפלים – IDs (לדרופדאון)
  assignedProducerId?: string | null;
  assignedStaffIds?: string[];

  // 🔽 תצוגה (אם את עדיין משתמשת במיילים איפשהו)
  assignedProducerEmail?: string;
  assignedStaffEmail?: string;
};

type Assignee = {
  _id: string;
  name?: string;
  email?: string;
};

/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const [producers, setProducers] = useState<Assignee[]>([]);
  const [staff, setStaff] = useState<Assignee[]>([]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [assignedProducerId, setAssignedProducerId] = useState<string | null>(null);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  /* =========================
     LOAD DATA
  ========================= */
  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to load users:", res.status);
        return;
      }

      const data = await res.json();
      if (data?.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("loadUsers error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignees() {
    try {
      const res = await fetch("/api/admin/assignees", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to load assignees:", res.status);
        return;
      }

      const data = await res.json();
      if (data?.success) {
        setProducers(Array.isArray(data.producers) ? data.producers : []);
        setStaff(Array.isArray(data.staff) ? data.staff : []);
      }
    } catch (err) {
      console.error("loadAssignees error:", err);
    }
  }

  /* =========================
     ACTIONS
  ========================= */
  async function toggleCalls(userId: string, enable: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}/calls`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeCalls: enable,
          callsRounds: enable ? 3 : 0,
        }),
      });
      await loadUsers();
    } catch (err) {
      console.error("toggleCalls error:", err);
      alert("עדכון שירות שיחות נכשל");
    }
  }

  async function impersonateUser(userId: string) {
    try {
      setImpersonating(userId);

      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!data?.success) {
        alert(data?.message || "התחזות נכשלה");
        return;
      }

      // נזהה תפקיד בצורה עמידה
      const role = String(data?.impersonatedRole || data?.role || "").toLowerCase();
      const staffType = String(data?.staffType || "").toLowerCase();

      // ✅ הדרישה שלך: מפיק -> דשבורד מפיק
      if (role === "producer") {
        window.location.href = "/producer/dashboard";
        return;
      }

      // צוות מפיק
      if (role === "staff" || staffType === "producer-staff") {
        window.location.href = "/producer-staff/dashboard";
        return;
      }

      // לקוח/יוזר רגיל
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Impersonate error:", err);
      alert("אירעה שגיאה בהתחזות");
    } finally {
      setImpersonating(null);
    }
  }

  function removeUserFromView(userId: string) {
    if (!confirm("להסיר את המשתמש מהתצוגה?")) return;
    const updated = [...hiddenUserIds, userId];
    setHiddenUserIds(updated);
    sessionStorage.setItem("adminHiddenUsers", JSON.stringify(updated));
  }

  function startEdit(user: AdminUser) {
    setEditingUserId(user._id);
    setAssignedProducerId(user.assignedProducerId ?? null);
    setAssignedStaffIds(user.assignedStaffIds ?? []);
  }

  async function quickUpdateAssignees(
    userId: string,
    payload: { assignedProducerId?: string | null; assignedStaffIds?: string[] }
  ) {
    try {
      await fetch(`/api/admin/users/${userId}/assignees`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadUsers();
    } catch (err) {
      console.error("quickUpdateAssignees error:", err);
      alert("עדכון המטפלים נכשל");
    }
  }

  async function saveEditAssignees(userId: string) {
    try {
      await fetch(`/api/admin/users/${userId}/assignees`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedProducerId: assignedProducerId ?? null,
          assignedStaffIds: assignedStaffIds ?? [],
        }),
      });

      setEditingUserId(null);
      await loadUsers();
    } catch (err) {
      console.error("saveEditAssignees error:", err);
      alert("שמירה נכשלה");
    }
  }

  /* =========================
     EFFECTS
  ========================= */
  useEffect(() => {
    const stored = sessionStorage.getItem("adminHiddenUsers");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setHiddenUserIds(parsed);
      } catch (err) {
        console.error("Failed parsing adminHiddenUsers:", err);
      }
    }

    loadUsers();
    loadAssignees();
  }, []);

  if (loading) return <div className="text-gray-500">טוען משתמשים…</div>;

  const visibleUsers = users.filter((u) => !hiddenUserIds.includes(u._id));

  /* =========================
     RENDER
  ========================= */
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">ניהול משתמשים</h1>
        <button
          onClick={() => setOpenCreate(true)}
          className="px-4 py-2 rounded-lg bg-black text-white"
        >
          ➕ יצירת משתמש
        </button>
      </div>

      <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
        <table className="min-w-full text-right">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="p-3">שם</th>
              <th className="p-3">אימייל</th>
              <th className="p-3">תפקיד</th>
              <th className="p-3">חבילה</th>
              <th className="p-3">תאריך אירוע</th>
              <th className="p-3">מפיק מטפל</th>
              <th className="p-3">עובד מטפל</th>
              <th className="p-3">שירות שיחות</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {visibleUsers.map((u) => (
              <React.Fragment key={u._id}>
                {/* ROW */}
                <tr className="border-t text-sm">
                  <td className="p-3">{u.name || "-"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 font-semibold">{u.role}</td>
                  <td className="p-3">{u.plan || "-"}</td>
                  <td className="p-3">
                    {u.eventDate
                      ? new Date(u.eventDate).toLocaleDateString("he-IL")
                      : "—"}
                  </td>

                  {/* מפיק מטפל */}
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={u.assignedProducerId || ""}
                      onChange={async (e) => {
                        await quickUpdateAssignees(u._id, {
                          assignedProducerId: e.target.value || null,
                          assignedStaffIds: u.assignedStaffIds || [],
                        });
                      }}
                    >
                      <option value="">— ללא מפיק —</option>
                      {producers.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name || p.email || "ללא שם"}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* עובד מטפל (יחיד דרך dropdown מהיר) */}
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={u.assignedStaffIds?.[0] || ""}
                      onChange={async (e) => {
                        await quickUpdateAssignees(u._id, {
                          assignedProducerId: u.assignedProducerId || null,
                          assignedStaffIds: e.target.value ? [e.target.value] : [],
                        });
                      }}
                    >
                      <option value="">— ללא עובד —</option>
                      {staff.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name || s.email || "ללא שם"}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">
                    {u.includeCalls ? `☎️ פעיל (${u.callsRounds ?? 0})` : "לא פעיל"}
                  </td>

                  <td className="p-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => startEdit(u)}
                      className="px-3 py-1 bg-gray-700 text-white rounded-full text-xs"
                    >
                      עריכת מטפלים
                    </button>

                    <button
                      onClick={() => toggleCalls(u._id, !u.includeCalls)}
                      className="px-3 py-1 bg-black text-white rounded-full text-xs"
                    >
                      {u.includeCalls ? "כבה שיחות" : "הפעל שיחות"}
                    </button>

                    {u.role !== "admin" && (
                      <button
                        onClick={() => impersonateUser(u._id)}
                        disabled={impersonating === u._id}
                        className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs disabled:opacity-50"
                      >
                        {impersonating === u._id ? "נכנס..." : "כניסה בהתחזות"}
                      </button>
                    )}

                    {u.role !== "admin" && (
                      <button
                        onClick={() => removeUserFromView(u._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-full text-xs"
                      >
                        הסר
                      </button>
                    )}
                  </td>
                </tr>

                {/* EDIT ROW */}
                {editingUserId === u._id && (
                  <tr className="bg-gray-50">
                    <td colSpan={9} className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm mb-1">מפיק מטפל</label>
                        <select
                          className="border rounded px-3 py-2 w-full"
                          value={assignedProducerId ?? ""}
                          onChange={(e) => setAssignedProducerId(e.target.value || null)}
                        >
                          <option value="">ללא מפיק</option>
                          {producers.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name || p.email || "ללא שם"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">עובדים מטפלים</label>
                        <select
                          multiple
                          className="border rounded px-3 py-2 w-full h-32"
                          value={assignedStaffIds}
                          onChange={(e) =>
                            setAssignedStaffIds(
                              Array.from(e.target.selectedOptions, (o) => o.value)
                            )
                          }
                        >
                          {staff.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name || s.email || "ללא שם"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditAssignees(u._id)}
                          className="px-4 py-2 bg-black text-white rounded"
                        >
                          שמור
                        </button>

                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-4 py-2 bg-gray-300 rounded"
                        >
                          ביטול
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  לא נמצאו משתמשים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openCreate && <CreateUserModal onClose={() => setOpenCreate(false)} />}
    </div>
  );
}
