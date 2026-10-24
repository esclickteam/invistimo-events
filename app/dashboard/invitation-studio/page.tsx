"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InvitationArt from "@/components/invitation-studio/InvitationArt";
import {
  CATEGORY_LABELS,
  STYLE_LABELS,
  STUDIO_CATEGORIES,
  STUDIO_STYLES,
  type StudioCategory,
  type StudioSnapshot,
  type StudioStyle,
} from "@/lib/invitationStudio/types";

type Card = {
  id: string;
  name: string;
  category: StudioCategory;
  style: StudioStyle;
  description: string;
  free: boolean;
  motion: string;
  formats: { static: boolean; digital: boolean; animated: boolean; video: false };
  preview: StudioSnapshot;
};

export default function InvitationStudioCatalogPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [entitlement, setEntitlement] = useState<{ entitled: boolean; reason: string } | null>(null);
  const [settings, setSettings] = useState<{ priceIls: number; description: string; includedInCurrentPackages: boolean } | null>(null);
  const [category, setCategory] = useState<StudioCategory | "all">("all");
  const [style, setStyle] = useState<StudioStyle | "all">("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    fetch("/api/invitation-studio", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "טעינה נכשלה");
        setCards(data.templates || []);
        setEntitlement(data.entitlement);
        setSettings(data.settings);
      })
      .catch((err) => setError(err.message || "טעינה נכשלה"));
  }, []);

  const visible = useMemo(
    () =>
      cards.filter(
        (card) =>
          (category === "all" || card.category === category) &&
          (style === "all" || card.style === style)
      ),
    [cards, category, style]
  );

  async function choose(templateId: string) {
    setBusy(templateId);
    setError("");
    const res = await fetch("/api/invitation-studio/designs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok || !data.designId) {
      setError(data.error === "FORBIDDEN" ? "אין גישה לאירוע הזה" : "לא ניתן לפתוח את התבנית");
      return;
    }
    router.push(`/dashboard/invitation-studio/${data.designId}`);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f1e8] px-4 py-8 text-[#2d241c] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold tracking-[0.22em] text-[#b58a55]">סטודיו הזמנות</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">הזמנה דיגיטלית מעוצבת</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b5846]">
          {settings?.description ||
            "בחרו עיצוב מתוך מגוון תבניות יוקרתיות, התאימו את פרטי האירוע וצרו הזמנה אישית ומרשימה לאורחים שלכם."}
        </p>
        <div className="mt-4 rounded-3xl border border-[#eadfce] bg-white/80 px-5 py-4 text-sm leading-7">
          {entitlement?.entitled
            ? "ההזמנה הדיגיטלית כלולה בחבילה או בזכאות הקיימת שלכם. אפשר לעצב, לפרסם ולהוריד בלי תשלום נוסף."
            : `תצוגה מקדימה פתוחה. פרסום וייצוא נקי של תבנית בתשלום נפתחים רק אחרי זכאות מאומתת. מחיר עצמאי: ${settings?.priceIls ?? 150} ₪, לפי ההגדרה באדמין.`}
          {settings?.includedInCurrentPackages
            ? " לקוח שכבר רכש חבילה עם הזמנה דיגיטלית לא מחויב שוב."
            : ""}
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          <Filter active={category === "all"} onClick={() => setCategory("all")}>הכל</Filter>
          {STUDIO_CATEGORIES.map((item) => (
            <Filter key={item} active={category === item} onClick={() => setCategory(item)}>
              {CATEGORY_LABELS[item]}
            </Filter>
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
          <Filter active={style === "all"} onClick={() => setStyle("all")}>כל הסגנונות</Filter>
          {STUDIO_STYLES.map((item) => (
            <Filter key={item} active={style === item} onClick={() => setStyle(item)}>
              {STYLE_LABELS[item]}
            </Filter>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => (
            <article
              key={card.id}
              data-testid={`template-${card.id}`}
              className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-[0_18px_50px_rgba(92,66,38,0.08)]"
            >
              <div className="bg-[#f3eadf] p-4">
                <div className="mx-auto max-w-[220px]">
                  <InvitationArt snapshot={card.preview} />
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">{card.name}</h2>
                    <p className="text-xs text-[#8a7055]">
                      {CATEGORY_LABELS[card.category]} · {STYLE_LABELS[card.style]}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#fff4e4] px-3 py-1 text-xs font-black text-[#8a5a25]">
                    {card.free ? "כלולה" : "בתשלום"}
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#5c4b3a]">{card.description}</p>
                <p className="text-xs font-bold text-[#8a7055]">
                  הורדה · קישור דיגיטלי
                  {card.formats.animated ? " · אנימציה עדינה" : ""}
                </p>
                <button
                  type="button"
                  disabled={busy === card.id}
                  onClick={() => choose(card.id)}
                  className="w-full rounded-2xl bg-[#2d241c] px-4 py-3 text-sm font-black text-white"
                >
                  {busy === card.id ? "פותח…" : "עריכת ההזמנה"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Filter({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
        active ? "bg-[#2d241c] text-white" : "bg-white text-[#5c4b3a]"
      }`}
    >
      {children}
    </button>
  );
}
