"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ImagePlus, Loader2, Save, Settings } from "lucide-react";

type SettingsForm = {
  name: string;
  subtitle: string;
  capacity: number;
  status: string;
  image: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
};

const emptyForm: SettingsForm = {
  name: "",
  subtitle: "",
  capacity: 0,
  status: "active",
  image: "",
  address: "",
  phone: "",
  email: "",
  timezone: "Asia/Jerusalem",
};

export default function VenueSettingsPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/settings`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      const s = data.settings || {};
      setForm({
        name: s.name || "",
        subtitle: s.subtitle || "",
        capacity: Number(s.capacity || 0),
        status: s.status || "active",
        image: s.image || "",
        address: s.address || "",
        phone: s.phone || "",
        email: s.email || "",
        timezone: s.timezone || "Asia/Jerusalem",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) load();
  }, [hallId]);

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "שמירה נכשלה");
      }
      setMessage("ההגדרות נשמרו בהצלחה");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadHallImage = async (file: File | null) => {
    if (!file || !hallId) return;
    setUploadingImage(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/image`,
        { method: "PATCH", body: fd }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "העלאת תמונה נכשלה");
      }
      update("image", data.image || data.file?.url || "");
      setMessage("תמונת האולם הועלתה ונשמרה");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "העלאת תמונה נכשלה");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-7">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div>
          <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › הגדרות</div>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
            <Settings className="text-[#b98121]" />
            הגדרות אולם
          </h1>
          <p className="mt-2 text-sm font-bold text-[#7f705d]">
            פרטי האולם, כתובת, טלפון, אימייל ואזור זמן.
          </p>
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-[#8a7b68]">
          <Loader2 size={20} className="animate-spin text-[#b98121]" />
          טוען הגדרות...
        </div>
      ) : (
        <div className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="שם אולם" value={form.name} onChange={(v) => update("name", v)} />
            <Field label="תיאור קצר" value={form.subtitle} onChange={(v) => update("subtitle", v)} />
            <Field
              label="קיבולת"
              type="number"
              value={String(form.capacity)}
              onChange={(v) => update("capacity", Math.max(0, Number(v) || 0))}
            />
            <label>
              <span className="mb-2 block text-sm font-black text-[#6f6252]">סטטוס</span>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold outline-none focus:border-[#b98121]"
              >
                <option value="active">פעיל</option>
                <option value="maintenance">תחזוקה</option>
                <option value="closed">סגור</option>
              </select>
            </label>
            <Field label="כתובת" value={form.address} onChange={(v) => update("address", v)} />
            <Field label="טלפון" value={form.phone} onChange={(v) => update("phone", v)} />
            <Field label="אימייל" value={form.email} onChange={(v) => update("email", v)} />
            <Field
              label="אזור זמן"
              value={form.timezone}
              onChange={(v) => update("timezone", v)}
            />
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-black text-[#6f6252]">
                תמונת אולם
              </span>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 sm:flex-row sm:items-center">
                {form.image ? (
                  <img
                    src={form.image}
                    alt={form.name || "תמונת אולם"}
                    className="h-24 w-36 rounded-xl object-cover border border-[#eadfce]"
                  />
                ) : (
                  <div className="flex h-24 w-36 items-center justify-center rounded-xl border border-dashed border-[#d9bd83] bg-white text-xs font-bold text-[#8a7b68]">
                    אין תמונה
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      uploadHallImage(e.target.files?.[0] || null)
                    }
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-4 text-sm font-black text-white disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ImagePlus size={16} />
                    )}
                    העלאת תמונה
                  </button>
                  <p className="text-xs font-bold text-[#8a7b68]">
                    נשמר ב-Cloudinary ומקושר לאולם. החלפה מוחקת את הקודמת מהאחסון.
                  </p>
                  <Field
                    label="או קישור ידני (אופציונלי)"
                    value={form.image}
                    onChange={(v) => update("image", v)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-[#eadfce] pt-5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              שמירה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-black text-[#6f6252]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold outline-none focus:border-[#b98121]"
      />
    </label>
  );
}
