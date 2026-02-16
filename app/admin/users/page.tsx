"use client";

import { useEffect, useMemo, useState } from "react";
import CreateUserModal from "./CreateUserModal";

/* =========================
   TYPES
========================= */
type UserRole = "admin" | "user" | "client" | "producer" | "staff";
type PlanType = "basic" | "premium" | "plan1" | "plan2" | "plan3";
type StaffType = "producer_staff" | "general_staff" | null;

type AdminUser = {
  _id: string;
  name?: string;
  email: string;
  role: UserRole;
  staffType?: StaffType;
  plan?: PlanType;
  includeCalls?: boolean;
  callsRounds?: number;
  createdAt?: string;
  eventDate?: string;

  // IDs
  assignedProducerId?: string | null;
  assignedStaffIds?: string[];

  // תצוגה
  assignedProducerEmail?: string;
  assignedStaffEmail?: string;
};

type ProducerOption = {
  _id: string;
  name?: string;
  email?: string;
};

type StaffOption = {
  _id: string;
  name?: string;
  email?: string;
  staffType?: StaffType;
  assignedProducerId?: string | null;
};

/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const [producers, setProducers] = useState<ProducerOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [assignedProducerId, setAssignedProducerId] = useState<string | null>(null);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [savingAssignees, setSavingAssignees] = useState(false);

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
      if (data.success) setUsers(data.users || []);
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
      setProducers(data.producers || []);
      setStaff(data.staff || []);
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
    await loadUsers();
  }

  async function impersonateUser(userId: string) {
    setImpersonating(userId);

    try {
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

  async function patchAssignees(
    userId: string,
    payload: { assignedProducerId: string | null; assignedStaffIds: string[] }
  ) {
    const res = await fetch(`/api/admin/users/${userId}/assignees`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      const msg = data?.message || "שמירת שיוכים נכשלה";
      alert(msg);
      return false;
    }
    return true;
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

  /* עובדים לפי מפיק שנבחר בעריכת שורה */
  const filteredStaffForEditor = useMemo(() => {
    if (!assignedProducerId) return [];
    return staff.filter(
      (s) =>
        s.staffType === "producer_staff" &&
        String(s.assignedProducerId || "") === String(assignedProducerId)
    );
  }, [staff, assignedProducerId]);

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
              .map((u) => {
                const rowStaffOptions = staff.filter((s) => {
                  if (s.staffType !== "producer_staff") return false;
                  if (!u.assignedProducerId) return false;
                  return String(s.assignedProducerId || "") === String(u.assignedProducerId);
                });

                return (
                  <FragmentRow key={u._id}>
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

                      {/* מפיק */}
                      <td className="p-3">
                        <select
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={u.assignedProducerId || ""}
                          onChange={async (e) => {
                            const nextProducerId = e.target.value || null;
                            // אם מחליפים מפיק – מנקים עובדים כדי לא ליצור mismatch
                            const ok = await patchAssignees(u._id, {
                              assignedProducerId: nextProducerId,
                              assignedStaffIds: [],
                            });
                            if (ok) await loadUsers();
                          }}
                        >
                          <option value="">— ללא מפיק —</option>
                          {producers.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name || p.email || p._id}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* עובד */}
                      <td className="p-3">
                        <select
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={u.assignedStaffIds?.[0] || ""}
                          onChange={async (e) => {
                            const selectedStaffId = e.target.value ? [e.target.value] : [];
                            const ok = await patchAssignees(u._id, {
                              assignedProducerId: u.assignedProducerId || null,
                              assignedStaffIds: selectedStaffId,
                            });
                            if (ok) await loadUsers();
                          }}
                          disabled={!u.assignedProducerId}
                          title={!u.assignedProducerId ? "בחרי קודם מפיק" : ""}
                        >
                          <option value="">
                            {!u.assignedProducerId ? "בחרי קודם מפיק" : "— ללא עובד —"}
                          </option>
                          {rowStaffOptions.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name || s.email || s._id}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        {u.includeCalls ? `☎️ פעיל (${u.callsRounds || 0})` : "לא פעיל"}
                      </td>

                      <td className="p-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setEditingUserId(u._id);
                            // ✅ טוענים ערכים קיימים ולא מאפסים
                            setAssignedProducerId(u.assignedProducerId || null);
                            setAssignedStaffIds(u.assignedStaffIds || []);
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
                            disabled={impersonating === u._id}
                            className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs disabled:opacity-60"
                          >
                            {impersonating === u._id ? "טוען..." : "כניסה בהתחזות"}
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
                              onChange={(e) => {
                                const nextProducer = e.target.value || null;
                                setAssignedProducerId(nextProducer);
                                // מחליפים מפיק => מנקים עובדים כדי למנוע שיוך לא תקין
                                setAssignedStaffIds([]);
                              }}
                            >
                              <option value="">ללא מפיק</option>
                              {producers.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name || p.email || p._id}
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
                              disabled={!assignedProducerId}
                            >
                              {filteredStaffForEditor.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name || s.email || s._id}
                                </option>
                              ))}
                            </select>
                            {!assignedProducerId && (
                              <p className="text-xs text-gray-500 mt-1">
                                בחרי קודם מפיק כדי לשייך עובדים.
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                // הגנה בצד לקוח לפני שליחה:
                                if (!assignedProducerId && assignedStaffIds.length > 0) {
                                  alert("לא ניתן לשייך עובדים בלי בחירת מפיק.");
                                  return;
                                }

                                setSavingAssignees(true);
                                try {
                                  const ok = await patchAssignees(u._id, {
                                    assignedProducerId,
                                    assignedStaffIds,
                                  });
                                  if (ok) {
                                    setEditingUserId(null);
                                    await loadUsers();
                                  }
                                } finally {
                                  setSavingAssignees(false);
                                }
                              }}
                              disabled={savingAssignees}
                              className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
                            >
                              {savingAssignees ? "שומר..." : "שמור"}
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
                  </FragmentRow>
                );
              })}

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

/**
 * Helper קטן כדי לאפשר key ל-fragment בלי לייבא Fragment בכל מקום
 */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
