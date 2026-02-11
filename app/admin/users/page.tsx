"use client";

import { useEffect, useMemo, useState } from "react";
import CreateUserModal from "./CreateUserModal";

/* =========================
   TYPES
========================= */
type RoleType = "admin" | "producer" | "staff" | "client" | "user";

type AdminUser = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: RoleType;
  staffType?: string;
  plan?: "basic" | "premium";
  includeCalls?: boolean;
  callsRounds?: number;
  createdAt?: string;
  eventDate?: string;

  assignedProducerId?: string | null;
  assignedStaffIds?: string[];

  // שדות תצוגה אופציונליים
  assignedProducerEmail?: string;
  assignedStaffEmail?: string;
};

type AssigneeLite = {
  _id: string;
  name?: string;
  email?: string;
};

type AssigneesPatchBody = {
  assignedProducerId: string | null;
  assignedStaffIds: string[];
};

type UsersResponse = {
  success: boolean;
  users?: AdminUser[];
  error?: string;
};

type AssigneesResponse = {
  success: boolean;
  producers?: AssigneeLite[];
  staff?: AssigneeLite[];
  error?: string;
};

type GenericResponse = {
  success: boolean;
  message?: string;
  error?: string;
  role?: "producer" | "staff" | "client";
  impersonatedRole?: "producer" | "staff" | "client";
};

/* =========================
   HELPERS
========================= */
function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function safeArrayOfIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => normalizeId(v))
    .filter((v): v is string => Boolean(v));
}

function getDisplayRole(u: AdminUser): string {
  if (u.role === "user" && u.staffType === "producer_staff") return "staff";
  return u.role;
}

/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const [producers, setProducers] = useState<AssigneeLite[]>([]);
  const [staff, setStaff] = useState<AssigneeLite[]>([]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [assignedProducerId, setAssignedProducerId] = useState<string | null>(null);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  const [savingAssigneesUserId, setSavingAssigneesUserId] = useState<string | null>(null);

  /* =========================
     LOADERS
  ========================= */
  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });

      const data: UsersResponse = await res.json().catch(() => ({ success: false }));
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("loadUsers error:", err);
      setUsers([]);
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

      const data: AssigneesResponse = await res.json().catch(() => ({ success: false }));
      if (res.ok && data.success) {
        setProducers(Array.isArray(data.producers) ? data.producers : []);
        setStaff(Array.isArray(data.staff) ? data.staff : []);
      } else {
        setProducers([]);
        setStaff([]);
      }
    } catch (err) {
      console.error("loadAssignees error:", err);
      setProducers([]);
      setStaff([]);
    }
  }

  /* =========================
     API ACTIONS
  ========================= */
  async function updateAssignees(userId: string, body: AssigneesPatchBody): Promise<boolean> {
    try {
      setSavingAssigneesUserId(userId);

      const payload: AssigneesPatchBody = {
        assignedProducerId: normalizeId(body.assignedProducerId),
        assignedStaffIds: safeArrayOfIds(body.assignedStaffIds),
      };

      const res = await fetch(`/api/admin/users/${userId}/assignees`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: GenericResponse = await res.json().catch(() => ({ success: false }));

      if (!res.ok || !data.success) {
        alert(data?.error || data?.message || "שגיאה בשמירת ההקצאה");
        return false;
      }

      await loadUsers();
      return true;
    } catch (err) {
      console.error("updateAssignees error:", err);
      alert("שגיאה בשמירת ההקצאה");
      return false;
    } finally {
      setSavingAssigneesUserId(null);
    }
  }

  async function toggleCalls(userId: string, enable: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/calls`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeCalls: enable,
          callsRounds: enable ? 3 : 0,
        }),
      });

      const data: GenericResponse = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !data.success) {
        alert(data?.error || data?.message || "שגיאה בעדכון שירות שיחות");
        return;
      }

      await loadUsers();
    } catch (err) {
      console.error("toggleCalls error:", err);
      alert("שגיאה בעדכון שירות שיחות");
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

      const data: GenericResponse = await res.json().catch(() => ({ success: false }));

      if (!res.ok || !data.success) {
        alert(data?.error || data?.message || "שגיאה בהתחזות");
        return;
      }

      const role = data.impersonatedRole || data.role;

      if (role === "producer") {
        window.location.href = "/producer/dashboard";
      } else if (role === "staff") {
        window.location.href = "/producer-staff/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("impersonateUser error:", err);
      alert("שגיאה בהתחזות");
    } finally {
      setImpersonating(null);
    }
  }

  function removeUserFromView(userId: string) {
    if (!confirm("להסיר את המשתמש מהתצוגה?")) return;
    const updated = Array.from(new Set([...hiddenUserIds, userId]));
    setHiddenUserIds(updated);
    sessionStorage.setItem("adminHiddenUsers", JSON.stringify(updated));
  }

  /* =========================
     EFFECTS
  ========================= */
  useEffect(() => {
    const stored = sessionStorage.getItem("adminHiddenUsers");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHiddenUserIds(parsed.map(String));
        }
      } catch {
        // ignore
      }
    }

    void loadUsers();
    void loadAssignees();
  }, []);

  const visibleUsers = useMemo(
    () => users.filter((u) => !hiddenUserIds.includes(u._id)),
    [users, hiddenUserIds]
  );

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
            {visibleUsers.map((u) => {
              const isEditing = editingUserId === u._id;
              const isSavingThisUser = savingAssigneesUserId === u._id;
              const isImpersonating = impersonating === u._id;

              return (
                <FragmentRow
                  key={u._id}
                  user={u}
                  producers={producers}
                  staff={staff}
                  isEditing={isEditing}
                  isSaving={isSavingThisUser}
                  isImpersonating={isImpersonating}
                  assignedProducerId={assignedProducerId}
                  assignedStaffIds={assignedStaffIds}
                  setAssignedProducerId={setAssignedProducerId}
                  setAssignedStaffIds={setAssignedStaffIds}
                  onEditOpen={() => {
                    setEditingUserId(u._id);
                    setAssignedProducerId(normalizeId(u.assignedProducerId));
                    setAssignedStaffIds(safeArrayOfIds(u.assignedStaffIds));
                  }}
                  onEditClose={() => {
                    setEditingUserId(null);
                    setAssignedProducerId(null);
                    setAssignedStaffIds([]);
                  }}
                  onQuickProducerChange={async (producerId: string | null) => {
                    await updateAssignees(u._id, {
                      assignedProducerId: producerId,
                      assignedStaffIds: safeArrayOfIds(u.assignedStaffIds),
                    });
                  }}
                  onQuickStaffChange={async (staffId: string) => {
                    await updateAssignees(u._id, {
                      assignedProducerId: normalizeId(u.assignedProducerId),
                      assignedStaffIds: staffId ? [staffId] : [],
                    });
                  }}
                  onSaveEdit={async () => {
                    const ok = await updateAssignees(u._id, {
                      assignedProducerId,
                      assignedStaffIds,
                    });
                    if (ok) {
                      setEditingUserId(null);
                    }
                  }}
                  onToggleCalls={toggleCalls}
                  onImpersonate={impersonateUser}
                  onRemove={() => removeUserFromView(u._id)}
                />
              );
            })}

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

/* =========================
   ROW COMPONENT
========================= */
type FragmentRowProps = {
  user: AdminUser;
  producers: AssigneeLite[];
  staff: AssigneeLite[];

  isEditing: boolean;
  isSaving: boolean;
  isImpersonating: boolean;

  assignedProducerId: string | null;
  assignedStaffIds: string[];

  setAssignedProducerId: (id: string | null) => void;
  setAssignedStaffIds: (ids: string[]) => void;

  onEditOpen: () => void;
  onEditClose: () => void;

  onQuickProducerChange: (producerId: string | null) => Promise<void>;
  onQuickStaffChange: (staffId: string) => Promise<void>;
  onSaveEdit: () => Promise<void>;

  onToggleCalls: (userId: string, enable: boolean) => Promise<void>;
  onImpersonate: (userId: string) => Promise<void>;
  onRemove: () => void;
};

function FragmentRow({
  user: u,
  producers,
  staff,
  isEditing,
  isSaving,
  isImpersonating,
  assignedProducerId,
  assignedStaffIds,
  setAssignedProducerId,
  setAssignedStaffIds,
  onEditOpen,
  onEditClose,
  onQuickProducerChange,
  onQuickStaffChange,
  onSaveEdit,
  onToggleCalls,
  onImpersonate,
  onRemove,
}: FragmentRowProps) {
  return (
    <>
      <tr className="border-t text-sm">
        <td className="p-3">{u.name || "-"}</td>
        <td className="p-3">{u.email}</td>
        <td className="p-3 font-semibold">{getDisplayRole(u)}</td>
        <td className="p-3">{u.plan || "-"}</td>
        <td className="p-3">
          {u.eventDate ? new Date(u.eventDate).toLocaleDateString("he-IL") : "—"}
        </td>

        {/* Quick Producer */}
        <td className="p-3">
          <select
            className="border rounded px-2 py-1 text-sm w-full"
            value={u.assignedProducerId || ""}
            disabled={isSaving}
            onChange={async (e) => {
              const producerId = normalizeId(e.target.value);
              await onQuickProducerChange(producerId);
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

        {/* Quick Staff (single-select quick mode) */}
        <td className="p-3">
          <select
            className="border rounded px-2 py-1 text-sm w-full"
            value={u.assignedStaffIds?.[0] || ""}
            disabled={isSaving}
            onChange={async (e) => {
              const staffId = String(e.target.value || "");
              await onQuickStaffChange(staffId);
            }}
          >
            <option value="">— ללא עובד —</option>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name || s.email || s._id}
              </option>
            ))}
          </select>
        </td>

        <td className="p-3">{u.includeCalls ? `☎️ פעיל (${u.callsRounds || 0})` : "לא פעיל"}</td>

        <td className="p-3 flex gap-2 flex-wrap">
          <button
            onClick={onEditOpen}
            className="px-3 py-1 bg-gray-700 text-white rounded-full text-xs"
          >
            עריכת מטפלים
          </button>

          <button
            onClick={() => onToggleCalls(u._id, !u.includeCalls)}
            className="px-3 py-1 bg-black text-white rounded-full text-xs"
          >
            {u.includeCalls ? "כבה שיחות" : "הפעל שיחות"}
          </button>

          {u.role !== "admin" && (
            <button
              onClick={() => onImpersonate(u._id)}
              disabled={isImpersonating}
              className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs disabled:opacity-60"
            >
              {isImpersonating ? "נכנס..." : "כניסה בהתחזות"}
            </button>
          )}

          {u.role !== "admin" && (
            <button
              onClick={onRemove}
              className="px-3 py-1 bg-red-600 text-white rounded-full text-xs"
            >
              הסר
            </button>
          )}
        </td>
      </tr>

      {/* Edit row */}
      {isEditing && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="p-4 space-y-4">
            <div>
              <label className="block text-sm mb-1">מפיק מטפל</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={assignedProducerId ?? ""}
                onChange={(e) => setAssignedProducerId(normalizeId(e.target.value))}
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
              <label className="block text-sm mb-1">עובדים מטפלים (מרובה בחירה)</label>
              <select
                multiple
                className="border rounded px-3 py-2 w-full h-32"
                value={assignedStaffIds}
                onChange={(e) =>
                  setAssignedStaffIds(
                    Array.from(e.target.selectedOptions, (o) => String(o.value))
                  )
                }
              >
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name || s.email || s._id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSaveEdit}
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? "שומר..." : "שמור"}
              </button>

              <button onClick={onEditClose} className="px-4 py-2 bg-gray-300 rounded">
                ביטול
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
