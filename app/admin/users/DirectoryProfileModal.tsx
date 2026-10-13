"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";

export type DirectoryProfileMode =
  | "producer-details"
  | "staff-details"
  | "staff-permissions"
  | "account";

type DirectoryProfileUser = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  isActive?: boolean;
  staffType?: string | null;
  producerPricePerRecord?: number | null;
};

const STAFF_TYPE_OPTIONS = [
  { value: "general_staff", label: "עובד מערכת" },
  { value: "seating_staff", label: "עובד הושבה" },
  { value: "usher_staff", label: "דייל" },
  { value: "producer_staff", label: "עובד של מפיק" },
] as const;

export function DirectoryProfileModal({
  user,
  mode,
  onClose,
  onSaved,
}: {
  user: DirectoryProfileUser;
  mode: DirectoryProfileMode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [pricePerRecord, setPricePerRecord] = useState(
    user.producerPricePerRecord == null ? "" : String(user.producerPricePerRecord)
  );
  const [staffType, setStaffType] = useState(user.staffType || "general_staff");
  const [isActive, setIsActive] = useState(user.isActive !== false);

  const title =
    mode === "producer-details"
      ? "פרטי מפיק"
      : mode === "staff-permissions"
        ? "הרשאות עובד"
        : mode === "account"
          ? "ניהול חשבון"
          : "פרטי עובד";

  async function saveProfile() {
    const payload: Record<string, unknown> = {};

    if (mode === "producer-details" || mode === "staff-details") {
      if (!name.trim() || !email.trim()) {
        alert("שם ואימייל הם שדות חובה");
        return;
      }
      payload.name = name.trim();
      payload.email = email.trim();
      payload.phone = phone.trim();
    }

    if (mode === "producer-details") {
      const price = Number(pricePerRecord);
      if (pricePerRecord.trim() === "" || !Number.isFinite(price) || price < 0) {
        alert("יש להזין מחיר לרשומה תקין");
        return;
      }
      payload.producerPricePerRecord = price;
    }

    if (mode === "staff-permissions") {
      payload.staffType = staffType;
    }

    if (mode === "account") {
      payload.isActive = isActive;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        alert(data?.error || "שמירת הפרטים נכשלה");
        return;
      }
      onSaved();
    } catch (error) {
      console.error(error);
      alert("שמירת הפרטים נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="directory-profile-modal"
    >
      <div
        className="flex max-h-[min(90dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-t-[var(--admin-radius)] border border-[var(--admin-border)] bg-white shadow-xl sm:rounded-[var(--admin-radius)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--admin-text)]">{title}</h2>
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--admin-muted)]">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white"
            aria-label="סגירה"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 overflow-auto px-4 py-4">
          {mode === "producer-details" || mode === "staff-details" ? (
            <div className="grid grid-cols-1 gap-3">
              <ProfileField label="שם מלא" value={name} onChange={setName} />
              <ProfileField label="אימייל" type="email" value={email} onChange={setEmail} />
              <ProfileField label="טלפון" type="tel" value={phone} onChange={setPhone} />
              {mode === "producer-details" ? (
                <ProfileField
                  label="מחיר לרשומה (₪)"
                  type="number"
                  value={pricePerRecord}
                  onChange={setPricePerRecord}
                />
              ) : null}
            </div>
          ) : null}

          {mode === "producer-details" ? (
            <p className="text-sm font-bold leading-6 text-[#7B6754]">
              מחיר לרשומה הוא הגדרת תמחור של המפיק. הוא לא שייך ללקוח או לאירוע.
            </p>
          ) : null}

          {mode === "staff-permissions" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">סוג עובד</span>
              <select
                value={staffType}
                onChange={(event) => setStaffType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-white px-4 text-sm font-black outline-none"
              >
                {STAFF_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {mode === "account" ? (
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 py-3">
              <span className="text-sm font-black text-[#3A2A1C]">סטטוס חשבון</span>
              <select
                value={isActive ? "active" : "inactive"}
                onChange={(event) => setIsActive(event.target.value === "active")}
                className="h-11 rounded-xl border border-[#E7D8C6] bg-white px-3 text-sm font-black outline-none"
              >
                <option value="active">פעיל</option>
                <option value="inactive">לא פעיל</option>
              </select>
            </label>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--admin-border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl bg-[#ECE7E1] px-5 text-sm font-black text-[#6B5A48]"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-5 text-sm font-black text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            שמור שינויים
          </button>
        </footer>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#6B5A48]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-white px-4 text-sm font-bold text-[#3A2A1C] outline-none"
      />
    </label>
  );
}
