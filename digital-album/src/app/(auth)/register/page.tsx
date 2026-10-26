"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label, Logo } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    tenantName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error || "שגיאה בהרשמה");
      return;
    }
    router.push("/portal");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="font-display mt-8 text-4xl">יצירת חשבון</h1>
      <p className="mt-2 text-[var(--muted)]">פתחו חשבון והתחלת אלבום דיגיטלי לאירוע</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label>שם מלא</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>שם החשבון / העסק</Label>
          <Input
            value={form.tenantName}
            onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
            placeholder="אופציונלי"
          />
        </div>
        <div>
          <Label>אימייל</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>סיסמה</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full" variant="gold">
          {loading ? "יוצר…" : "יצירת חשבון"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        כבר יש חשבון?{" "}
        <Link href="/login" className="underline text-[var(--ink)]">
          כניסה
        </Link>
      </p>
    </main>
  );
}
