"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminButton, AdminPanel } from "@/app/components/admin/ui/AdminUI";
import { BLOG_CATEGORIES } from "@/lib/blog/taxonomy";

type Faq = { q: string; a: string };

export type BlogEditorValue = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  categoryId: string;
  subcategoryId: string;
  coverImage: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  popular: boolean;
  status: "draft" | "published";
  faqs: Faq[];
};

const EMPTY: BlogEditorValue = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  categoryId: "planning",
  subcategoryId: "timelines",
  coverImage: "",
  coverAlt: "",
  seoTitle: "",
  seoDescription: "",
  featured: false,
  popular: false,
  status: "draft",
  faqs: [],
};

export default function BlogEditor({
  postId,
  initial,
}: {
  postId?: string;
  initial?: BlogEditorValue;
}) {
  const router = useRouter();
  const [value, setValue] = useState<BlogEditorValue>(initial || EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const subs = useMemo(
    () => BLOG_CATEGORIES.find((category) => category.id === value.categoryId)?.subcategories || [],
    [value.categoryId]
  );

  useEffect(() => {
    if (!subs.some((sub) => sub.id === value.subcategoryId) && subs[0]) {
      setValue((current) => ({ ...current, subcategoryId: subs[0].id }));
    }
  }, [subs, value.subcategoryId]);

  function patch(partial: Partial<BlogEditorValue>) {
    setValue((current) => ({ ...current, ...partial }));
  }

  async function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/blog/upload", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ההעלאה נכשלה");
    patch({ coverImage: data.url });
  }

  async function save(status: "draft" | "published") {
    setSaving(true);
    setError("");
    try {
      const payload = { ...value, status };
      const response = await fetch(postId ? `/api/admin/blog/${postId}` : "/api/admin/blog", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "שמירה נכשלה");
      const id = data.id || postId;
      if (!postId && id) router.replace(`/admin/blog/${id}`);
      else patch({ status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPanel>
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm font-bold">
          כותרת
          <input value={value.title} onChange={(event) => patch({ title: event.target.value })} className="h-10 border px-3 font-medium" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          כתובת באנגלית
          <input value={value.slug} onChange={(event) => patch({ slug: event.target.value })} className="h-10 border px-3 font-medium" dir="ltr" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          תקציר
          <textarea value={value.excerpt} onChange={(event) => patch({ excerpt: event.target.value })} className="min-h-20 border px-3 py-2 font-medium" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          תוכן
          <textarea value={value.body} onChange={(event) => patch({ body: event.target.value })} className="min-h-64 border px-3 py-2 font-medium" />
          <span className="font-medium text-[var(--admin-muted)]">פסקה חדשה אחרי שורה ריקה. כותרת: ## כותרת. כותרת משנה: ### כותרת. רשימה: שורה שמתחילה ב־«- ». רשימה ממוספרת: «1. ». טבלה: שורות שמתחילות ומסתיימות ב־|. הדגשה: **טקסט**. קישור: [טקסט](/path). תמונה: ![תיאור](/path.jpg). שאלות נפוצות נשמרות בשדה למטה, לא בגוף.</span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">
            קטגוריה
            <select value={value.categoryId} onChange={(event) => patch({ categoryId: event.target.value })} className="h-10 border px-3">
              {BLOG_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.title}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            תת־קטגוריה
            <select value={value.subcategoryId} onChange={(event) => patch({ subcategoryId: event.target.value })} className="h-10 border px-3">
              {subs.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.title}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-bold">
          תמונה ראשית
          <input value={value.coverImage} onChange={(event) => patch({ coverImage: event.target.value })} className="h-10 border px-3 font-medium" dir="ltr" placeholder="קישור לתמונה" />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file).catch((err) => setError(err.message));
            }}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          תיאור התמונה
          <input value={value.coverAlt} onChange={(event) => patch({ coverAlt: event.target.value })} className="h-10 border px-3 font-medium" placeholder="מה רואים בתמונה" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">
            כותרת לעמוד
            <input value={value.seoTitle} onChange={(event) => patch({ seoTitle: event.target.value })} className="h-10 border px-3 font-medium" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            תיאור לעמוד
            <input value={value.seoDescription} onChange={(event) => patch({ seoDescription: event.target.value })} className="h-10 border px-3 font-medium" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={value.featured} onChange={(event) => patch({ featured: event.target.checked })} />
          מאמר מומלץ
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={value.popular} onChange={(event) => patch({ popular: event.target.checked })} />
          מאמר פופולרי
        </label>
        <div className="grid gap-3">
          <p className="text-sm font-bold">שאלות נפוצות</p>
          {value.faqs.map((faq, index) => (
            <div key={index} className="grid gap-2 border p-3">
              <input value={faq.q} onChange={(event) => {
                const faqs = value.faqs.slice();
                faqs[index] = { ...faq, q: event.target.value };
                patch({ faqs });
              }} className="h-10 border px-3" placeholder="שאלה" />
              <textarea value={faq.a} onChange={(event) => {
                const faqs = value.faqs.slice();
                faqs[index] = { ...faq, a: event.target.value };
                patch({ faqs });
              }} className="min-h-16 border px-3 py-2" placeholder="תשובה" />
            </div>
          ))}
          <AdminButton variant="secondary" onClick={() => patch({ faqs: [...value.faqs, { q: "", a: "" }] })}>
            הוספת שאלה
          </AdminButton>
        </div>
        {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <AdminButton disabled={saving} onClick={() => save("draft")}>שמירה כטיוטה</AdminButton>
          <AdminButton disabled={saving} onClick={() => save("published")}>פרסום</AdminButton>
          {value.status === "published" ? (
            <AdminButton variant="secondary" disabled={saving} onClick={() => save("draft")}>ביטול פרסום</AdminButton>
          ) : null}
          {postId ? (
            <Link href={`/blog/preview/${postId}`} target="_blank" className="inline-flex h-10 items-center border px-3 text-[13px] font-bold">
              תצוגה מקדימה
            </Link>
          ) : null}
        </div>
      </div>
    </AdminPanel>
  );
}
