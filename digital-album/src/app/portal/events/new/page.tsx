"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

type Tenant = { id: string; name: string };

export default function NewEventPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantId: "",
    type: "WEDDING",
    title: "החתונה שלנו",
    hostNames: "",
    eventDate: "",
    uploadMode: "EVERYONE",
    mediaAllowed: "BOTH",
    requireApproval: true,
  });

  useEffect(() => {
    fetch("/api/portal/tenants")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data.tenants?.length) {
          setTenants(j.data.tenants);
          setForm((f) => ({ ...f, tenantId: j.data.tenants[0].id }));
        }
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        eventDate: form.eventDate
          ? new Date(form.eventDate).toISOString()
          : null,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error || "שגיאה");
      return;
    }
    router.push(`/portal/events/${json.data.event.id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">יצירת אירוע</h1>
      <p className="mt-2 text-[var(--muted)]">הגדרות בסיס — ניתן לערוך גם אחרי הפרסום</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label>חשבון</Label>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>סוג אירוע</Label>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="WEDDING">חתונה</option>
            <option value="BAR_MITZVAH">בר מצווה</option>
            <option value="BAT_MITZVAH">בת מצווה</option>
            <option value="BRIT">ברית</option>
            <option value="BIRTHDAY">יום הולדת</option>
            <option value="CORPORATE">עסקי</option>
            <option value="OTHER">אחר</option>
          </select>
        </div>
        <div>
          <Label>שמות בעלי השמחה</Label>
          <Input
            value={form.hostNames}
            onChange={(e) => setForm({ ...form, hostNames: e.target.value })}
            required
            placeholder="מיה ואלון"
          />
        </div>
        <div>
          <Label>כותרת</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>תאריך האירוע</Label>
          <Input
            type="datetime-local"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
          />
        </div>
        <div>
          <Label>מי יכול להעלות</Label>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
            value={form.uploadMode}
            onChange={(e) => setForm({ ...form, uploadMode: e.target.value })}
          >
            <option value="GUESTS_ONLY">אורחים בלבד</option>
            <option value="OWNERS_ONLY">בעלי השמחה בלבד</option>
            <option value="EVERYONE">כולם</option>
          </select>
        </div>
        <div>
          <Label>סוגי קבצים</Label>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
            value={form.mediaAllowed}
            onChange={(e) => setForm({ ...form, mediaAllowed: e.target.value })}
          >
            <option value="BOTH">תמונות וסרטונים</option>
            <option value="PHOTOS_ONLY">תמונות בלבד</option>
            <option value="VIDEOS_ONLY">סרטונים בלבד</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requireApproval}
            onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })}
          />
          תמונות נכנסות לתור אישור לפני הפרסום
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={loading || !form.tenantId}>
          {loading ? "יוצר…" : "יצירת האלבום"}
        </Button>
      </form>
    </div>
  );
}
