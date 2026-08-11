"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import WeddingWebsiteOwnerEditor, {
  type OwnerEditorWebsite,
} from "@/components/wedding-website/editor/WeddingWebsiteOwnerEditor";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import type { WeddingTemplateId } from "@/types/weddingWebsite";

function WeddingWebsiteManager() {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState<OwnerEditorWebsite | null>(null);
  const [inviteMeta, setInviteMeta] = useState<{
    shareId: string;
    title: string;
    invitePath: string;
    rsvpSiteMode: string;
  } | null>(null);
  const [templateId, setTemplateId] = useState<WeddingTemplateId>("eternal-gold");

  const load = useCallback(async () => {
    if (!invitationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/wedding-website?invitationId=${encodeURIComponent(invitationId)}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.error || "שגיאה בטעינה");
        return;
      }
      setInviteMeta(data.invitation);
      if (data.website) {
        setWebsite(data.website);
        setTemplateId(data.website.templateId);
      } else {
        setWebsite(null);
      }
    } catch {
      setMessage("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createWebsite = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/wedding-website", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, templateId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.error || "יצירה נכשלה");
        return;
      }
      setMessage("אתר החתונה נוצר כטיוטה");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!invitationId) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-[#241A14]">עריכת אתר החתונה</h1>
        <p className="mt-3 text-sm font-semibold text-[#8A7B69]">
          יש לפתוח את המסך דרך עריכת ההזמנה — חסר מזהה הזמנה.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-bold text-[#B8844F]">
          חזרה לדשבורד
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div dir="rtl" className="px-4 py-16 text-center text-sm font-bold text-[#8A7B69]">
        טוען אתר חתונה...
      </div>
    );
  }

  if (website && inviteMeta) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 pb-24">
        <WeddingWebsiteOwnerEditor
          website={website}
          inviteMeta={inviteMeta}
          invitationId={invitationId}
          onSaved={(next) => setWebsite(next)}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="mb-8 rounded-[28px] border border-[#E3D0B8] bg-[#FFFDF9] p-6 shadow-sm">
        <p className="text-xs font-black text-[#B8844F]">מוצר נפרד · לא מחליף הזמנה רגילה</p>
        <h1 className="mt-2 text-3xl font-black text-[#241A14]">עריכת אתר החתונה</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[#8A7B69]">
          צרו אתר חתונה עם תבנית, עריכת תוכן/צבעים/מדיה ו-Live Preview. ההזמנה הרגילה נשארת ללא שינוי.
        </p>
        {inviteMeta && (
          <div className="mt-5 rounded-2xl border border-[#EFE4D6] bg-white px-4 py-3">
            <p className="text-[11px] font-black text-[#8A7B69]">הזמנה אישית (מוגן)</p>
            <p className="mt-1 text-sm font-bold text-[#241A14]">{inviteMeta.invitePath}</p>
          </div>
        )}
        {message ? <p className="mt-4 text-sm font-bold text-[#B8844F]">{message}</p> : null}
      </div>

      <div className="rounded-[28px] border border-dashed border-[#D9B46F] bg-white p-8">
        <h2 className="text-xl font-black text-[#241A14]">יצירת אתר חתונה</h2>
        <p className="mt-2 text-sm font-semibold text-[#8A7B69]">בחרו תבנית התחלה ואז תערכו בלייב.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {WEDDING_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={`rounded-2xl border p-2 text-right ${
                templateId === t.id
                  ? "border-[#D9B46F] bg-[#FFF9EF]"
                  : "border-[#EFE4D6] bg-[#FCFAF6]"
              }`}
            >
              <div
                className="mb-2 h-20 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${t.previewImage})` }}
              />
              <p className="text-xs font-black text-[#241A14]">{t.name}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void createWebsite()}
          className="mt-6 rounded-full bg-[#B8844F] px-8 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? "יוצר..." : "צור אתר חתונה"}
        </button>
      </div>
    </div>
  );
}

export default function WeddingWebsiteDashboardPage() {
  return (
    <Suspense
      fallback={
        <div dir="rtl" className="px-4 py-16 text-center text-sm font-bold text-[#8A7B69]">
          טוען...
        </div>
      }
    >
      <WeddingWebsiteManager />
    </Suspense>
  );
}
