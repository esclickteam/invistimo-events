"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InvitationPlate from "@/components/invitation-studio/InvitationPlate";
import { ANIMATION_LABELS, type StudioPlate } from "@/lib/invitationStudio/plates";
import { CATEGORY_LABELS, STYLE_LABELS, type StudioCategory } from "@/lib/invitationStudio/types";

const FILTERS: Array<{ id: StudioCategory | "animated" | "all"; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "animated", label: "הזמנות מונפשות" },
  { id: "wedding", label: "חתונות" },
];

export default function InvitationStudioCatalogPage() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [plates, setPlates] = useState<StudioPlate[]>([]);

  useEffect(() => {
    fetch("/api/invitation-studio", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "טעינה נכשלה");
        setPlates(Array.isArray(data.plates) ? data.plates : []);
        setNote(
          data.entitlement?.entitled
            ? "ההזמנה הדיגיטלית כלולה בזכאות הקיימת. אין חיוב נוסף."
            : `תצוגה מקדימה פתוחה. פרסום נפתח אחרי זכאות. מחיר עצמאי: ${data.settings?.priceIls ?? 150} ₪.`
        );
      })
      .catch((err) => setNote(err.message || "טעינה נכשלה"));
  }, []);

  const visible = useMemo(
    () =>
      plates.filter((plate) => plate.listed !== false).filter((plate) => {
        if (filter === "all") return true;
        if (filter === "animated") return plate.animation !== "none";
        return plate.category === filter;
      }),
    [filter, plates]
  );

  async function choose(templateId: string) {
    setBusy(templateId);
    const res = await fetch("/api/invitation-studio/designs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok || !data.designId) {
      setNote("לא ניתן לפתוח את התבנית");
      return;
    }
    router.push(`/dashboard/invitation-studio/${data.designId}`);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f3eee7] px-4 py-8 text-[#2c241c] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold tracking-[0.22em] text-[#a68455]">סטודיו הזמנות</p>
        <h1 className="mt-2 text-4xl font-black">הזמנות מעוצבות</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6d5b4b]">
          בוחרים הזמנה מוכנה ומחליפים את פרטי האירוע. העיצוב, הנייר והטיפוגרפיה נשארים כמו בקטלוג.
        </p>
        {note ? <p className="mt-4 rounded-3xl bg-white/80 px-5 py-4 text-sm leading-7">{note}</p> : null}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item.id ? "bg-[#2c241c] text-white" : "bg-white text-[#5c4b3a]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
          {visible.map((plate) => (
            <article key={plate.id} data-testid={`template-${plate.id}`} className="overflow-hidden rounded-[32px] bg-white shadow-[0_24px_60px_rgba(60,40,20,0.08)]">
              <InvitationPlate plate={plate} />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{plate.name}</h2>
                    <p className="text-sm text-[#8a7055]">
                      {CATEGORY_LABELS[plate.category]} · {STYLE_LABELS[plate.style]}
                      {plate.animation !== "none" ? ` · ${ANIMATION_LABELS[plate.animation]}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-[#5c4b3a]">{plate.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard/invitation-studio/watch/${plate.id}`}
                    className="rounded-2xl border border-[#eadfce] px-4 py-3 text-center text-sm font-black"
                  >
                    {plate.animation !== "none" ? "צפייה בהזמנה" : "תצוגה מקדימה"}
                  </Link>
                  <button
                    type="button"
                    disabled={busy === plate.id}
                    onClick={() => choose(plate.id)}
                    className="rounded-2xl bg-[#2c241c] px-4 py-3 text-sm font-black text-white"
                  >
                    {busy === plate.id ? "פותח…" : "בחרו ועצבו"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
