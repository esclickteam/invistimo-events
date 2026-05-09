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
  role: "admin" | "user";
  plan?: string;
guests?: number;
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

const [editName, setEditName] = useState("");
const [editEmail, setEditEmail] = useState("");
const [editEventDate, setEditEventDate] = useState("");
const [editGuests, setEditGuests] = useState<number>(0);

const [assignedProducerId, setAssignedProducerId] =
  useState<string | null>(null);

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
              <th className="p-3">רשומות</th>
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
      <React.Fragment key={u._id}>
                
                  {/* ROW */}
                  <tr className="border-t text-sm hover:bg-gray-50 transition">
                    <td className="p-3">{u.name || "-"}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3 font-semibold">{u.role}</td>
                    <td className="p-3">{u.plan || "-"}</td>
                    <td className="p-3 font-semibold">
  {u.guests || 0}
</td>
                    <td className="p-3">
                      {u.eventDate
                        ? new Date(u.eventDate).toLocaleDateString("he-IL")
                        : "—"}
                    </td>

                    <td className="p-3">
  {producers.find((p) => p._id === u.assignedProducerId)?.name || "—"}
</td>

                    
                    <td className="p-3">
  {staff.find((s) => s._id === u.assignedStaffIds?.[0])?.name || "—"}
</td>

                    <td className="p-3">
                      {u.includeCalls ? `☎️ פעיל (${u.callsRounds})` : "לא פעיל"}
                    </td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <button
  onClick={() => {
    setEditingUserId(u._id);

    setEditName(u.name || "");
    setEditEmail(u.email || "");

    setEditEventDate(
      u.eventDate
        ? new Date(u.eventDate).toISOString().split("T")[0]
        : ""
    );

    setEditGuests(u.guests || 0);

    setAssignedProducerId(u.assignedProducerId || null);

    setAssignedStaffIds(u.assignedStaffIds || []);
  }}
  className="px-3 py-1 bg-gray-700 text-white rounded-full text-xs"
>
  עריכת משתמש
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
          {/* EDIT USER ROW */}
{editingUserId === u._id && (
  <tr className="bg-gray-50 border-b animate-in fade-in duration-300">
    <td colSpan={10} className="p-6">
      <div className="bg-white border rounded-2xl p-6 shadow-sm">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              עריכת משתמש
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              עריכת פרטי משתמש, רשומות ומטפלים
            </p>
          </div>

          <button
            onClick={() => setEditingUserId(null)}
            className="text-sm text-gray-500 hover:text-black"
          >
            ✕ סגור
          </button>
        </div>

        {/* USER DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* NAME */}
          <div>
            <label className="block text-sm font-medium mb-2">
              שם מלא
            </label>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              אימייל
            </label>

            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          {/* EVENT DATE */}
          <div>
            <label className="block text-sm font-medium mb-2">
              תאריך אירוע
            </label>

            <input
              type="date"
              value={editEventDate}
              onChange={(e) => setEditEventDate(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          {/* GUESTS */}
          <div>
            <label className="block text-sm font-medium mb-2">
              כמות רשומות / אורחים
            </label>

            <input
              type="number"
              value={editGuests}
              onChange={(e) =>
                setEditGuests(Number(e.target.value))
              }
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>
        </div>

        {/* ASSIGNEES */}
        <div className="mt-8 border-t pt-6">

          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            מטפלים
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* PRODUCER */}
            <div>
              <label className="block text-sm mb-2">
                מפיק מטפל
              </label>

              <select
                className="w-full border rounded-xl px-4 py-3"
                value={assignedProducerId ?? ""}
                onChange={(e) =>
                  setAssignedProducerId(
                    e.target.value || null
                  )
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

            {/* STAFF */}
            <div>
              <label className="block text-sm mb-2">
                עובדים מטפלים
              </label>

              <select
                multiple
                className="w-full border rounded-xl px-4 py-3 h-36"
                value={assignedStaffIds}
                onChange={(e) =>
                  setAssignedStaffIds(
                    Array.from(
                      e.target.selectedOptions,
                      (o) => o.value
                    )
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
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-8">

          <button
            onClick={async () => {
              await fetch(`/api/admin/users/${u._id}`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: editName,
                  email: editEmail,
                  eventDate: editEventDate,
                  guests: editGuests,
                }),
              });

              await fetch(
                `/api/admin/users/${u._id}/assignees`,
                {
                  method: "PATCH",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    assignedProducerId,
                    assignedStaffIds,
                  }),
                }
              );

              setEditingUserId(null);

              loadUsers();
            }}
            className="px-6 py-3 bg-black text-white rounded-xl hover:opacity-90"
          >
            שמור שינויים
          </button>

          <button
            onClick={() => setEditingUserId(null)}
            className="px-6 py-3 bg-gray-200 rounded-xl"
          >
            ביטול
          </button>
        </div>
      </div>
    </td>
  </tr>
)}
                </React.Fragment>
              ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
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
