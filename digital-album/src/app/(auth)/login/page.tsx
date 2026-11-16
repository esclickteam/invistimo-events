"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label, Logo } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@album.local");
  const [password, setPassword] = useState("OwnerDemo!23");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error || "שגיאה בהתחברות");
      return;
    }
    if (json.data.user.role === "SUPER_ADMIN") router.push("/admin");
    else router.push("/portal");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="font-display mt-8 text-4xl">כניסה</h1>
      <p className="mt-2 text-[var(--muted)]">לפורטל הלקוח או למערכת המנהל</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label>אימייל</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div>
          <Label>סיסמה</Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "מתחבר…" : "כניסה"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        אין חשבון?{" "}
        <Link href="/register" className="text-[var(--ink)] underline">
          הרשמה
        </Link>
      </p>
    </main>
  );
}
