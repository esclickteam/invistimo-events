"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import VenueConfirmDialog from "@/components/venues/VenueConfirmDialog";
import {
  VENUE_PERMISSION_GROUPS,
  VENUE_ROLE_LABELS,
  VENUE_ROLES,
  type VenueRole,
} from "@/lib/venues/permissions";

type EmployeeRow = {
  id: string;
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: VenueRole;
  status: "active" | "disabled";
  lastLoginAt?: string | null;
  customPermissions: string[];
  permissions: string[];
  jobTitle?: string;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "VIEWER" as VenueRole,
  jobTitle: "",
  permissions: [] as string[],
};

export default function VenueEmployeesPermissionsPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [resetPassword, setResetPassword] = useState("");
  const [pendingDisable, setPendingDisable] = useState<EmployeeRow | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/employees`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      setRows(data.employees || []);
    } catch (err: any) {
      setError(err?.message || "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) load();
  }, [hallId]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setResetPassword("");
    setModalOpen(true);
  };

  const openEdit = (row: EmployeeRow) => {
    setEditId(row.membershipId);
    setForm({
      name: row.name,
      email: row.email,
      phone: row.phone,
      password: "",
      role: row.role,
      jobTitle: row.jobTitle || "",
      permissions: row.customPermissions || [],
    });
    setResetPassword("");
    setModalOpen(true);
  };

  const togglePermission = (key: string) => {
    setForm((current) => {
      const exists = current.permissions.includes(key);
      return {
        ...current,
        permissions: exists
          ? current.permissions.filter((p) => p !== key)
          : [...current.permissions, key],
      };
    });
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!editId) {
        const res = await fetch(
          `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/employees`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "יצירה נכשלה");
        }
        setMessage("המשתמש נוצר בהצלחה");
      } else {
        const res = await fetch(
          `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/employees`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              membershipId: editId,
              name: form.name,
              email: form.email,
              phone: form.phone,
              role: form.role,
              permissions: form.permissions,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "עדכון נכשל");
        }
        setMessage("העובד עודכן");
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (
    membershipId: string,
    action: "disable" | "enable" | "revoke"
  ) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/employees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipId, action }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "עדכון סטטוס נכשל");
      }
      setPendingDisable(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "עדכון סטטוס נכשל");
    } finally {
      setSaving(false);
    }
  };

  const requestDisable = (row: EmployeeRow) => {
    setPendingDisable(row);
  };

  const doResetPassword = async (membershipId: string) => {
    if (resetPassword.trim().length < 8) {
      setError("סיסמה חדשה חייבת להכיל לפחות 8 תווים");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/employees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipId,
            action: "resetPassword",
            password: resetPassword,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "איפוס סיסמה נכשל");
      }
      setMessage("הסיסמה אופסה");
      setResetPassword("");
    } catch (err: any) {
      setError(err?.message || "איפוס סיסמה נכשל");
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(() => "עובדים והרשאות", []);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-7">
        <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › {title}</div>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
                <Users className="text-[#b98121]" />
                {title}
              </h1>
              <p className="mt-2 text-sm font-bold text-[#7f705d]">
                ניהול משתמשי מערכת של האולם, תפקידים והרשאות מותאמות. נפרד לחלוטין מעובדי Invistimo.
              </p>
              <p className="mt-2 text-xs font-bold text-[#9b8a73]">
                טיפ: התחילי עם תפקיד VIEWER לעובדים חדשים, והרחיבי הרשאות לפי הצורך.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/venues/dashboard/halls/${encodeURIComponent(hallId)}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black"
              >
                <ArrowRight size={16} />
                חזרה לאולם
              </Link>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-4 text-sm font-black text-white"
              >
                <UserPlus size={16} />
                משתמש חדש
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-[#fbf5ea] text-[#7f705d]">
                <tr>
                  <th className="px-4 py-3 font-black">שם</th>
                  <th className="px-4 py-3 font-black">אימייל / טלפון</th>
                  <th className="px-4 py-3 font-black">Role</th>
                  <th className="px-4 py-3 font-black">סטטוס</th>
                  <th className="px-4 py-3 font-black">כניסה אחרונה</th>
                  <th className="px-4 py-3 font-black">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#8a7b68]">
                      <Loader2 className="mx-auto animate-spin" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#8a7b68]">
                      אין עדיין משתמשי מערכת לאולם זה
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.membershipId} className="border-t border-[#f0e6d8]">
                      <td className="px-4 py-3 font-black">{row.name || "—"}</td>
                      <td className="px-4 py-3 font-bold text-[#6f6252]">
                        <div>{row.email || "—"}</div>
                        <div className="text-xs">{row.phone || ""}</div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {VENUE_ROLE_LABELS[row.role] || row.role}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            row.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {row.status === "active" ? "פעיל" : "חסום"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#8a7b68]">
                        {row.lastLoginAt
                          ? new Date(row.lastLoginAt).toLocaleString("he-IL")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded-xl border border-[#eadfce] px-3 py-1.5 text-xs font-black"
                          >
                            עריכה
                          </button>
                          {row.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => requestDisable(row)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-black text-rose-700"
                            >
                              <Lock size={12} />
                              חסימה
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatus(row.membershipId, "enable")}
                              className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-black text-emerald-700"
                            >
                              פתיחה
                            </button>
                          )}
                          {row.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  typeof window !== "undefined" &&
                                  window.confirm(
                                    `לבטל גישה לצמיתות עבור ${row.name}? הסשן יבוטל.`
                                  )
                                ) {
                                  void setStatus(row.membershipId, "revoke");
                                }
                              }}
                              className="rounded-xl border border-[#eadfce] px-3 py-1.5 text-xs font-black text-[#6f6252]"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {modalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <ShieldCheck className="text-[#b98121]" />
                  {editId ? "עריכת משתמש" : "משתמש חדש"}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-sm font-black text-[#8a7b68]"
                >
                  סגור
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="שם מלא"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <Field
                  label="אימייל / username"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                />
                <Field
                  label="טלפון"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                />
                {!editId ? (
                  <Field
                    label="סיסמה התחלתית"
                    value={form.password}
                    onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                    type="password"
                  />
                ) : null}
                <label className="grid gap-1 text-sm font-bold text-[#6f6252]">
                  Role
                  <select
                    className="h-11 rounded-2xl border border-[#eadfce] px-3"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value as VenueRole,
                      }))
                    }
                  >
                    {VENUE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {VENUE_ROLE_LABELS[role]} ({role})
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="תפקיד תפעולי"
                  value={form.jobTitle}
                  onChange={(v) => setForm((f) => ({ ...f, jobTitle: v }))}
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm font-black">הרשאות מותאמות (תוספת ל-role)</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {VENUE_PERMISSION_GROUPS.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-[#eadfce] bg-[#fbf8f2] p-3"
                    >
                      <div className="mb-2 text-xs font-black text-[#9f6f1a]">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.permissions.map((p) => (
                          <label
                            key={p.key}
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={form.permissions.includes(p.key)}
                              onChange={() => togglePermission(p.key)}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editId ? (
                <div className="mt-5 rounded-2xl border border-[#eadfce] p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black">
                    <KeyRound size={16} />
                    איפוס סיסמה
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      type="password"
                      className="h-11 flex-1 rounded-2xl border border-[#eadfce] px-3"
                      placeholder="סיסמה חדשה"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => doResetPassword(editId)}
                      className="h-11 rounded-2xl border border-[#d9bd83] px-4 text-sm font-black"
                    >
                      אפס סיסמה
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-2xl border border-[#eadfce] px-4 text-sm font-black"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={submit}
                  className="h-11 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white disabled:opacity-60"
                >
                  {saving ? "שומר..." : "שמירה"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <VenueConfirmDialog
          open={Boolean(pendingDisable)}
          title="חסימת משתמש"
          message={
            pendingDisable
              ? `לחסום את ${pendingDisable.name || pendingDisable.email}? המשתמש לא יוכל להתחבר לאולם עד שתפתחי אותו מחדש.`
              : ""
          }
          confirmLabel="חסום"
          danger
          loading={saving}
          onConfirm={() =>
            pendingDisable && setStatus(pendingDisable.membershipId, "disable")
          }
          onCancel={() => setPendingDisable(null)}
        />
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#6f6252]">
      {label}
      <input
        type={type}
        className="h-11 rounded-2xl border border-[#eadfce] px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
