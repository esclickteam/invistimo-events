"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import type { WeddingSiteContent, WeddingTemplateId } from "@/types/weddingWebsite";

type WebsiteState = {
  id: string;
  shareId: string;
  templateId: WeddingTemplateId;
  status: "draft" | "published";
  content: Partial<WeddingSiteContent>;
  sections: Record<string, boolean>;
  publicPath: string;
  resolvedContent?: WeddingSiteContent;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-[#8A7B69]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-[#E7DED1] bg-white px-4 py-3 text-sm font-semibold text-[#241A14] outline-none focus:border-[#D9B46F]";

function WeddingWebsiteManager() {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState<WebsiteState | null>(null);
  const [inviteMeta, setInviteMeta] = useState<{
    shareId: string;
    title: string;
    invitePath: string;
    rsvpSiteMode: string;
  } | null>(null);
  const [draftContent, setDraftContent] = useState<Partial<WeddingSiteContent>>({});
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
        setDraftContent(data.website.content || {});
      } else {
        setWebsite(null);
        setDraftContent({});
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

  const saveContent = async (extra: Record<string, unknown> = {}) => {
    if (!website?.id) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/wedding-website/${website.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          content: draftContent,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.error || "שמירה נכשלה");
        return;
      }
      setWebsite((prev) =>
        prev
          ? {
              ...prev,
              ...data.website,
            }
          : prev
      );
      setMessage("נשמר בהצלחה");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    await saveContent({ status: "published" });
    setMessage("האתר פורסם — הקישור הציבורי פעיל");
  };

  const unpublish = async () => {
    await saveContent({ status: "draft" });
    setMessage("האתר חזר לטיוטה");
  };

  const previewUrl = useMemo(() => {
    if (!website?.shareId) return "";
    const base = `/w/${website.shareId}`;
    return website.status === "published" ? base : `${base}?preview=1`;
  }, [website]);

  const updateField = <K extends keyof WeddingSiteContent>(
    key: K,
    value: WeddingSiteContent[K]
  ) => {
    setDraftContent((prev) => ({ ...prev, [key]: value }));
  };

  if (!invitationId) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-[#241A14]">אתר חתונה אישי</h1>
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

  return (
    <div dir="rtl" className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="mb-8 rounded-[28px] border border-[#E3D0B8] bg-[#FFFDF9] p-6 shadow-sm">
        <p className="text-xs font-black text-[#B8844F]">מוצר נפרד · לא מחליף הזמנה רגילה</p>
        <h1 className="mt-2 text-3xl font-black text-[#241A14]">אתר חתונה אישי</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[#8A7B69]">
          בחירת תבנית, עריכת תוכן ופרסום אתר ציבורי בכתובת נפרדת.
          ההזמנה הרגילה והקישור האישי נשארים ללא שינוי.
        </p>

        {inviteMeta && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#EFE4D6] bg-white px-4 py-3">
              <p className="text-[11px] font-black text-[#8A7B69]">הזמנה אישית (מוגן)</p>
              <p className="mt-1 text-sm font-bold text-[#241A14]">{inviteMeta.invitePath}</p>
            </div>
            <div className="rounded-2xl border border-[#EFE4D6] bg-white px-4 py-3">
              <p className="text-[11px] font-black text-[#8A7B69]">אתר חתונה</p>
              <p className="mt-1 text-sm font-bold text-[#241A14]">
                {website ? website.publicPath : "עדיין לא נוצר"}
              </p>
            </div>
          </div>
        )}

        {message ? (
          <p className="mt-4 text-sm font-bold text-[#B8844F]">{message}</p>
        ) : null}
      </div>

      {!website ? (
        <div className="rounded-[28px] border border-dashed border-[#D9B46F] bg-white p-8 text-center">
          <h2 className="text-xl font-black text-[#241A14]">יצירת אתר חתונה</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-[#8A7B69]">
            נוצר כטיוטה ומחובר לאירוע ולנתוני ההזמנה — בלי לשנות את קישור ההזמנה הרגיל.
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createWebsite()}
            className="mt-6 rounded-full bg-[#B8844F] px-8 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {saving ? "יוצר..." : "צור אתר חתונה"}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#E7DED1] bg-white p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#241A14]">בחירת תבנית</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    website.status === "published"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#FFF4DF] text-[#B8844F]"
                  }`}
                >
                  {website.status === "published" ? "מפורסם" : "טיוטה"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {WEDDING_TEMPLATES.map((t) => {
                  const selected = templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`rounded-2xl border p-3 text-right transition ${
                        selected
                          ? "border-[#D9B46F] bg-[#FFF9EF] shadow-sm"
                          : "border-[#EFE4D6] bg-[#FCFAF6] hover:border-[#E7D0B0]"
                      }`}
                    >
                      <div
                        className="mb-3 h-28 rounded-xl bg-cover bg-center"
                        style={{ backgroundImage: `url(${t.previewImage})` }}
                      />
                      <p className="text-sm font-black text-[#241A14]">{t.name}</p>
                      <p className="mt-1 text-xs font-semibold text-[#8A7B69]">{t.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-[28px] border border-[#E7DED1] bg-white p-6">
              <h2 className="text-lg font-black text-[#241A14]">עריכת תוכן</h2>
              <p className="text-xs font-semibold text-[#8A7B69]">
                שדות ריקים יימשכו אוטומטית משמות/תאריך/מיקום של האירוע וההזמנה.
              </p>

              <Field label="כותרת / שמות הזוג">
                <input
                  className={inputClass}
                  value={draftContent.coupleNames || ""}
                  onChange={(e) => updateField("coupleNames", e.target.value)}
                  placeholder={inviteMeta?.title || ""}
                />
              </Field>
              <Field label="משפט פתיחה (Hero)">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={draftContent.heroSubtitle || ""}
                  onChange={(e) => updateField("heroSubtitle", e.target.value)}
                />
              </Field>
              <Field label="טקסט הזמנה / ברוכים הבאים">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={draftContent.invitationText || ""}
                  onChange={(e) => updateField("invitationText", e.target.value)}
                />
              </Field>
              <Field label="הסיפור שלנו (פסקה בכל שורה)">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={(draftContent.storyParagraphs || []).join("\n")}
                  onChange={(e) =>
                    updateField(
                      "storyParagraphs",
                      e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                />
              </Field>
              <Field label="קוד לבוש">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={draftContent.dressCode || ""}
                  onChange={(e) => updateField("dressCode", e.target.value)}
                />
              </Field>
              <Field label="הסעות (כל שורה: כותרת | תיאור)">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={(draftContent.transportation || [])
                    .map((t) => `${t.title} | ${t.description}`)
                    .join("\n")}
                  onChange={(e) =>
                    updateField(
                      "transportation",
                      e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [title, ...rest] = line.split("|");
                          return {
                            title: (title || "").trim(),
                            description: rest.join("|").trim(),
                          };
                        })
                    )
                  }
                />
              </Field>
              <Field label="שאלות נפוצות (כל שורה: שאלה | תשובה)">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={(draftContent.faq || [])
                    .map((f) => `${f.question} | ${f.answer}`)
                    .join("\n")}
                  onChange={(e) =>
                    updateField(
                      "faq",
                      e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [question, ...rest] = line.split("|");
                          return {
                            question: (question || "").trim(),
                            answer: rest.join("|").trim(),
                          };
                        })
                    )
                  }
                />
              </Field>
              <Field label="טקסט מתנות">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={draftContent.giftsNote || ""}
                  onChange={(e) => updateField("giftsNote", e.target.value)}
                />
              </Field>
              <Field label="יצירת קשר / טלפון">
                <input
                  className={inputClass}
                  value={draftContent.contactPhone || ""}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                />
              </Field>
              <Field label="גלריה (כתובות URL מופרדות בפסיק)">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={(draftContent.galleryUrls || []).join(", ")}
                  onChange={(e) =>
                    updateField(
                      "galleryUrls",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </Field>
              <Field label="לו״ז (כל שורה: שעה | כותרת | תיאור)">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={(draftContent.schedule || [])
                    .map((s) => `${s.time} | ${s.title} | ${s.description}`)
                    .join("\n")}
                  onChange={(e) =>
                    updateField(
                      "schedule",
                      e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [time, title, ...rest] = line.split("|");
                          return {
                            time: (time || "").trim(),
                            title: (title || "").trim(),
                            description: rest.join("|").trim(),
                          };
                        })
                    )
                  }
                />
              </Field>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[28px] border border-[#E3D0B8] bg-[#FFFDF9] p-6 shadow-sm">
              <h3 className="text-base font-black text-[#241A14]">פעולות</h3>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveContent()}
                  className="rounded-full bg-[#241A14] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving ? "שומר..." : "שמור תבנית ותוכן"}
                </button>
                {website.status === "published" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void unpublish()}
                    className="rounded-full border border-[#E7DED1] bg-white px-5 py-3 text-sm font-black text-[#8A7B69]"
                  >
                    בטל פרסום
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void publish()}
                    className="rounded-full bg-[#B8844F] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    פרסם אתר
                  </button>
                )}
                {previewUrl ? (
                  <Link
                    href={previewUrl}
                    target="_blank"
                    className="rounded-full border border-[#D9B46F] bg-[#FFF9EF] px-5 py-3 text-center text-sm font-black text-[#8B5E34]"
                  >
                    תצוגה מקדימה
                  </Link>
                ) : null}
                <Link
                  href={`/dashboard/invitations/${invitationId}/edit`}
                  className="text-center text-sm font-bold text-[#8A7B69]"
                >
                  חזרה לעריכת הזמנה
                </Link>
              </div>
              <p className="mt-5 text-xs font-semibold leading-relaxed text-[#8A7B69]">
                בחירת תבנית כאן לא משנה את תבנית ההזמנה הרגילה, את ה-shareId,
                או את רשימת האורחים / RSVP.
              </p>
            </div>
          </aside>
        </div>
      )}
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
