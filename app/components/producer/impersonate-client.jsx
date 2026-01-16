"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Impersonate Client Button
 * Producer → Client Dashboard
 */
export default function ImpersonateClient({ clientId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleImpersonate() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/producer/impersonate-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Impersonation failed");
      }

      // מעבר לדשבורד הלקוח
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Impersonate error:", err);
      setError("לא ניתן להיכנס לדשבורד הלקוח");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        onClick={handleImpersonate}
        disabled={loading}
        className="
          inline-flex items-center justify-center
          rounded-lg px-4 py-2 text-sm font-medium
          border border-[#c7b8a3]
          text-[#5c4632]
          bg-transparent
          hover:bg-[#f3eee7]
          transition
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {loading ? "נכנס..." : "נהל"}
      </button>

      {error && (
        <span className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
