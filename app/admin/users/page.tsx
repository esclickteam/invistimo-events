"use client";

import { useEffect, useState } from "react";
import CreateUserModal from "./CreateUserModal";

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
  eventDate?: string;

  // 🔽 מטפלים – IDs (לדרופדאון)
  assignedProducerId?: string | null;
  assignedStaffIds?: string[];

  // 🔽 תצוגה (אם את עדיין משתמשת במיילים איפשהו)
  assignedProducerEmail?: string;
  assignedStaffEmail?: string;
};


/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const [producers, setProducers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

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
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignees() {
    const res = await fetch("/api/admin/assignees", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (data.success) {
      setProducers(data.producers);
      setStaff(data.staff);
    }
  }

  /* =========================
     ACTIONS
  ========================= */
  async function toggleCalls(userId: string, enable: boolean) {
    await fetch(`/api/admin/users/${userId}/calls`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeCalls: enable,
        callsRounds: enable ? 3 : 0,
      }),
    });
    loadUsers();
  }

  async function impersonateUser(userId: string) {
  setImpersonating(userId);

  const res = await fetch("/api/admin/impersonate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  const data = await res.json();
  if (!data.success) return;

  if (data.role === "producer") {
    window.location.href = "/producer/dashboard";
  } else if (data.role === "staff") {
    window.location.href = "/producer-staff/dashboard";
  } else {
    window.location.href = "/dashboard";
  }
}

  function removeUserFromView(userId: string) {
    if (!confirm("להסיר את המשתמש מהתצוגה?")) return;
    const updated = [...hiddenUserIds, userId];
    setHiddenUserIds(updated);
    sessionStorage.setItem("adminHiddenUsers", JSON.stringify(updated));
  }

  /* =========================
     EFFECTS
  ========================= */
  useEffect(() => {
    const stored = sessionStorage.getItem("adminHiddenUsers");
    if (stored) setHiddenUserIds(JSON.parse(stored));
    loadUsers();
    loadAssignees();
  }, []);

  if (loading) return <div className="text-gray-500">טוען משתמשים…</div>;

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
            {users
              .filter((u) => !hiddenUserIds.includes(u._id))
              .map((u) => (
                <>
                  {/* ROW */}
                  <tr key={u._id} className="border-t text-sm">
                    <td className="p-3">{u.name || "-"}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3 font-semibold">{u.role}</td>
                    <td className="p-3">{u.plan || "-"}</td>
                    <td className="p-3">
                      {u.eventDate
                        ? new Date(u.eventDate).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="p-3">
  <select
    className="border rounded px-2 py-1 text-sm w-full"
    value={u.assignedProducerId || ""}
    onChange={async (e) => {
      await fetch(`/api/admin/users/${u._id}/assignees`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedProducerId: e.target.value || null,
          assignedStaffIds: u.assignedStaffIds || [],
        }),
      });
      loadUsers();
    }}
  >
    <option value="">— ללא מפיק —</option>
    {producers.map((p) => (
      <option key={p._id} value={p._id}>
        {p.name}
      </option>
    ))}
  </select>
</td>

                    
                    <td className="p-3">
  <select
    className="border rounded px-2 py-1 text-sm w-full"
    value={u.assignedStaffIds?.[0] || ""}
    onChange={async (e) => {
      await fetch(`/api/admin/users/${u._id}/assignees`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedProducerId: u.assignedProducerId || null,
          assignedStaffIds: e.target.value ? [e.target.value] : [],
        }),
      });
      loadUsers();
    }}
  >
    <option value="">— ללא עובד —</option>
    {staff.map((s) => (
      <option key={s._id} value={s._id}>
        {s.name}
      </option>
    ))}
  </select>
</td>

                    <td className="p-3">
                      {u.includeCalls ? `☎️ פעיל (${u.callsRounds})` : "לא פעיל"}
                    </td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setEditingUserId(u._id);
                          setAssignedProducerId(null);
                          setAssignedStaffIds([]);
                        }}
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
    className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs"
  >
    כניסה בהתחזות
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
                            onChange={(e) =>
                              setAssignedProducerId(e.target.value || null)
                            }
                          >
                            <option value="">ללא מפיק</option>
                            {producers.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
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
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await fetch(
                                `/api/admin/users/${u._id}/assignees`,
                                {
                                  method: "PATCH",
                                  credentials: "include",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    assignedProducerId,
                                    assignedStaffIds,
                                  }),
                                }
                              );
                              setEditingUserId(null);
                              loadUsers();
                            }}
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
                </>
              ))}

            {users.length === 0 && (
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
