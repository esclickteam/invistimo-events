"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import type { WeddingDemoContent, WeddingTemplateId } from "@/types/weddingWebsite";
import { isPersonalRsvpSite } from "@/types/rsvpSite";

type EditorState = {
  templateId: WeddingTemplateId;
  published: boolean;
  content: WeddingDemoContent;
};

const emptyContent: WeddingDemoContent = {
  coupleNames: "",
  coupleShort: "",
  weddingDate: "",
  weddingTime: "",
  venueName: "",
  venueAddress: "",
  heroSubtitle: "",
  invitationText: "",
  storyParagraphs: ["", "", ""],
  howWeMet: "",
  proposalStory: "",
  schedule: [{ time: "", title: "", description: "" }],
  dressCode: "",
  accommodations: [{ name: "", note: "" }],
  transportation: [{ title: "", description: "" }],
  faq: [{ question: "", answer: "" }],
  giftsNote: "",
  guestbookMessages: [],
  playlistNote: "",
  footerNote: "",
};

export default function DashboardWeddingWebsitePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [shareId, setShareId] = useState("");
  const [invitationTitle, setInvitationTitle] = useState("");
  const [editor, setEditor] = useState<EditorState>({
    templateId: "eternal-gold",
    published: true,
    content: emptyContent,
  });

  const publicPath = shareId ? `/w/${shareId}` : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/wedding-website", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;

        const nextEnabled = Boolean(data?.enabled || isPersonalRsvpSite(data?.rsvpSiteMode));
        setEnabled(nextEnabled);
        setShareId(data?.invitation?.shareId || "");
        setInvitationTitle(data?.invitation?.title || "");

        if (data?.weddingWebsite) {
          setEditor({
            templateId: data.weddingWebsite.templateId,
            published: data.weddingWebsite.published !== false,
            content: {
              ...emptyContent,
              ...data.weddingWebsite.content,
              storyParagraphs: data.weddingWebsite.content?.storyParagraphs?.length
                ? data.weddingWebsite.content.storyParagraphs
                : emptyContent.storyParagraphs,
            },
          });
        }
      } catch (error) {
        console.error("Failed loading wedding website", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTemplate = useMemo(
    () => WEDDING_TEMPLATES.find((template) => template.id === editor.templateId),
    [editor.templateId]
  );

  async function save() {
    try {
      setSaving(true);
      setSaved(false);

      const res = await fetch("/api/wedding-website", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editor),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "SAVE_FAILED");
      }

      setSaved(true);
      if (data.publicPath) setShareId(String(data.publicPath).replace("/w/", ""));
    } catch (error) {
      console.error("Failed saving wedding website", error);
      alert("לא הצלחנו לשמור את אתר החתונה");
    } finally {
      setSaving(false);
    }
  }

  function updateContent<K extends keyof WeddingDemoContent>(
    key: K,
    value: WeddingDemoContent[K]
  ) {
    setEditor((prev) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
    setSaved(false);
  }

  if (loading) {
    return (
      <div dir="rtl" className="px-4 py-16 text-center text-sm font-bold text-[#8A7B69]">
        טוען אתר חתונה...
      </div>
    );
  }

  if (!enabled && !isPersonalRsvpSite(user?.rsvpSiteMode)) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[32px] border border-[#E7DED1] bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black text-[#B8844F]">אתר חתונה אישי</p>
          <h1 className="mt-3 text-3xl font-black text-[#241A14]">האתר לא פתוח ללקוח הזה</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#8A7B69]">
            לקוחות קיימים נשארים עם קישור אישי לכל אורח. אתר חתונה אישי נפתח רק
            בהקמת משתמש חדש, או בהפעלה ידנית לאותו לקוח באדמין.
          </p>
          <Link
            href="/wedding-website"
            className="mt-6 inline-flex rounded-2xl bg-[#B8844F] px-5 py-3 text-sm font-black text-white"
          >
            לצפייה בתבניות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black text-[#B8844F]">עריכת אתר חתונה</p>
          <h1 className="mt-2 text-3xl font-black text-[#241A14]">
            {invitationTitle || "אתר החתונה האישי"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-[#8A7B69]">
            כאן בוחרים תבנית, עורכים את התוכן, וצופים באתר כמו שהאורחים יראו אותו.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {publicPath ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#E7DED1] bg-white px-4 py-3 text-sm font-black text-[#241A14]"
            >
              צפייה באתר
            </a>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-[#B8844F] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? "שומר..." : saved ? "נשמר" : "שמירת האתר"}
          </button>
        </div>
      </div>

      <section className="mb-6 rounded-[28px] border border-[#E7DED1] bg-white p-5">
        <h2 className="text-lg font-black text-[#241A14]">בחירת תבנית</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WEDDING_TEMPLATES.map((template) => {
            const selected = editor.templateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setEditor((prev) => ({ ...prev, templateId: template.id }));
                  setSaved(false);
                }}
                className={`overflow-hidden rounded-[24px] border text-right ${
                  selected ? "border-[#B8844F] shadow-lg" : "border-[#EFE4D6]"
                }`}
              >
                <img src={template.previewImage} alt={template.name} className="h-36 w-full object-cover" />
                <div className="p-4">
                  <p className="text-sm font-black text-[#241A14]">{template.name}</p>
                  <p className="mt-1 text-xs font-semibold text-[#8A7B69]">{template.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-[28px] border border-[#E7DED1] bg-white p-5">
          <h2 className="text-lg font-black text-[#241A14]">תוכן האתר</h2>
          <Field label="שמות בני הזוג" value={editor.content.coupleNames} onChange={(value) => updateContent("coupleNames", value)} />
          <Field label="ראשי תיבות" value={editor.content.coupleShort} onChange={(value) => updateContent("coupleShort", value)} />
          <Field label="תאריך" type="date" value={editor.content.weddingDate} onChange={(value) => updateContent("weddingDate", value)} />
          <Field label="שעה" type="time" value={editor.content.weddingTime} onChange={(value) => updateContent("weddingTime", value)} />
          <Field label="שם האולם" value={editor.content.venueName} onChange={(value) => updateContent("venueName", value)} />
          <Field label="כתובת" value={editor.content.venueAddress} onChange={(value) => updateContent("venueAddress", value)} />
          <Field label="משפט פתיחה" value={editor.content.heroSubtitle} onChange={(value) => updateContent("heroSubtitle", value)} textarea />
          <Field label="טקסט הזמנה" value={editor.content.invitationText} onChange={(value) => updateContent("invitationText", value)} textarea />
          <Field label="איך נפגשנו" value={editor.content.howWeMet} onChange={(value) => updateContent("howWeMet", value)} textarea />
          <Field label="הצעת הנישואין" value={editor.content.proposalStory} onChange={(value) => updateContent("proposalStory", value)} textarea />
          <Field label="קוד לבוש" value={editor.content.dressCode} onChange={(value) => updateContent("dressCode", value)} textarea />
          <Field label="הערת מתנות" value={editor.content.giftsNote} onChange={(value) => updateContent("giftsNote", value)} textarea />
          <Field label="סיום" value={editor.content.footerNote} onChange={(value) => updateContent("footerNote", value)} textarea />
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#E7DED1] bg-[#111]">
          <div className="border-b border-white/10 px-5 py-4 text-white">
            <p className="text-xs font-black text-[#E8D5A8]">תצוגה חיה</p>
            <p className="mt-1 text-sm font-bold">{selectedTemplate?.name}</p>
          </div>
          {publicPath ? (
            <iframe
              title="תצוגת אתר חתונה"
              src={`${publicPath}?embed=1`}
              className="h-[820px] w-full bg-white"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-white/60">
              אין עדיין קישור לאתר
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  const className =
    "mt-2 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-sm font-semibold text-[#241A14] outline-none focus:border-[#c7a76c]";

  return (
    <label className="block text-sm font-black text-[#3f3327]">
      {label}
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={className} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={className} />
      )}
    </label>
  );
}
