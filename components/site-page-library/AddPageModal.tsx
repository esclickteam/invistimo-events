"use client";

import {
  POST_LOGIN_PAGE_TYPES,
  PUBLIC_PAGE_CATEGORIES,
  SECTION_TEMPLATES,
  buildPostLoginPageTemplates,
  buildPublicPageTemplates,
  countAllTemplates,
} from "@/config/sitePageLibrary/pageCatalog";
import SectionPreviewCard from "@/components/site-page-library/SectionPreviewCard";
import TemplatePreviewCard from "@/components/site-page-library/TemplatePreviewCard";
import type {
  LibrarySidebarTab,
  PageScope,
  PageTemplateDefinition,
  SectionTemplateDefinition,
  SitePageSelection,
} from "@/types/sitePageLibrary";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  shareId: string;
  invitationId: string;
  initialPages?: SitePageSelection[];
  existingSettings?: Record<string, unknown>;
  onPagesChange?: (pages: SitePageSelection[]) => void;
};

const SIDEBAR_TABS: {
  id: LibrarySidebarTab;
  label: string;
  icon: string;
}[] = [
  { id: "elements", label: "אלמנטים", icon: "◻️" },
  { id: "sections", label: "סקשנים", icon: "▦" },
  { id: "pages", label: "עמודים", icon: "📄" },
  { id: "plugins", label: "פלאגינים", icon: "🔌" },
  { id: "icons", label: "אייקונים", icon: "✦" },
  { id: "animations", label: "אנימציות", icon: "✨" },
  { id: "media", label: "מדיה", icon: "🎬" },
];

export default function AddPageModal({
  open,
  onClose,
  shareId,
  invitationId,
  initialPages = [],
  existingSettings = {},
  onPagesChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<LibrarySidebarTab>("pages");
  const [pageScope, setPageScope] = useState<PageScope>("public");
  const [selectedCategory, setSelectedCategory] = useState<string>("services");
  const [search, setSearch] = useState("");
  const [addedPages, setAddedPages] =
    useState<SitePageSelection[]>(initialPages);
  const [saving, setSaving] = useState(false);

  const totalTemplates = useMemo(() => countAllTemplates(shareId), [shareId]);

  const publicTemplates = useMemo(
    () => buildPublicPageTemplates(shareId),
    [shareId]
  );

  const postLoginTemplates = useMemo(
    () => buildPostLoginPageTemplates(shareId),
    [shareId]
  );

  const filteredPageTemplates = useMemo(() => {
    const pool =
      pageScope === "public" ? publicTemplates : postLoginTemplates;

    return pool.filter((template) => {
      const matchesCategory = template.categoryId === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.subtitle.toLowerCase().includes(q) ||
        template.route.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [
    pageScope,
    publicTemplates,
    postLoginTemplates,
    selectedCategory,
    search,
  ]);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SECTION_TEMPLATES;

    return SECTION_TEMPLATES.filter(
      (section) =>
        section.label.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q) ||
        section.category.toLowerCase().includes(q)
    );
  }, [search]);

  const pageCategories =
    pageScope === "public" ? PUBLIC_PAGE_CATEGORIES : POST_LOGIN_PAGE_TYPES;

  function handleAddPage(template: PageTemplateDefinition) {
    const selection: SitePageSelection = {
      templateId: template.id,
      scope: template.scope,
      route: template.route,
      title: template.title,
      addedAt: new Date().toISOString(),
    };

    setAddedPages((prev) => {
      const exists = prev.some((p) => p.templateId === template.id);
      if (exists) return prev;
      return [...prev, selection];
    });
  }

  function handleAddSection(section: SectionTemplateDefinition) {
    const selection: SitePageSelection = {
      templateId: section.id,
      scope: "public",
      route: `#section-${section.id}`,
      title: section.label,
      addedAt: new Date().toISOString(),
    };

    setAddedPages((prev) => {
      const exists = prev.some((p) => p.templateId === section.id);
      if (exists) return prev;
      return [...prev, selection];
    });
  }

  async function handleSave() {
    if (!invitationId || saving) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationSettings: {
            ...existingSettings,
            sitePages: addedPages,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשמירת העמודים");
      }

      onPagesChange?.(addedPages);
      onClose();
    } catch (error) {
      console.error("SAVE SITE PAGES FAILED:", error);
      alert(error instanceof Error ? error.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#241A14]/55 p-4 backdrop-blur-sm">
      <div
        className="flex h-[min(92vh,860px)] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-[#E3D6C3] bg-[#FFFDF9] shadow-[0_32px_80px_rgba(91,63,31,0.22)]"
        dir="rtl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E3D6C3] bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#241A14]">הוספת עמוד</h2>
            <p className="mt-0.5 text-xs font-bold text-[#8A7B69]">
              ספריית עמודים · {totalTemplates} תבניות בעברית
            </p>
          </div>

          <div className="flex items-center gap-2">
            {addedPages.length > 0 && (
              <span className="rounded-full bg-[#FFF9EF] px-3 py-1 text-xs font-black text-[#B8844F]">
                {addedPages.length} נוספו
              </span>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || addedPages.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#B8844F] px-4 text-sm font-black text-white transition hover:bg-[#96703A] disabled:opacity-40"
            >
              {saving ? "שומר..." : "שמירה"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E3D6C3] bg-white text-[#8A7B69] transition hover:bg-[#FFF9EF]"
              aria-label="סגירה"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="shrink-0 border-b border-[#F0E8DC] bg-[#FFFCF7] px-5 py-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש בתבניות..."
            className="h-11 w-full rounded-2xl border border-[#E3D6C3] bg-white px-4 text-sm font-bold text-[#241A14] outline-none placeholder:text-[#B5A593] focus:border-[#D9B46F]"
          />
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Icon sidebar */}
          <aside className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-l border-[#F0E8DC] bg-[#FFFCF7] py-3">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`flex h-12 w-12 flex-col items-center justify-center rounded-2xl text-lg transition ${
                  activeTab === tab.id
                    ? "bg-[#FFF9EF] text-[#B8844F] ring-2 ring-[#E8D5A8]"
                    : "text-[#8A7B69] hover:bg-white"
                }`}
              >
                <span>{tab.icon}</span>
              </button>
            ))}
          </aside>

          {/* Category sidebar — only for pages tab, NO separate "אזור אישי" */}
          {activeTab === "pages" && (
            <aside className="flex w-[180px] shrink-0 flex-col border-l border-[#F0E8DC] bg-white">
              {/* Scope toggle INSIDE pages tab */}
              <div className="border-b border-[#F0E8DC] p-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-[#8A7B69]">
                  סוג עמודים
                </p>
                <div className="flex rounded-2xl border border-[#E3D6C3] bg-[#FFF9EF] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPageScope("public");
                      setSelectedCategory("services");
                    }}
                    className={`flex-1 rounded-xl py-2 text-[11px] font-black transition ${
                      pageScope === "public"
                        ? "bg-white text-[#B8844F] shadow-sm"
                        : "text-[#8A7B69]"
                    }`}
                  >
                    ציבוריים
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPageScope("postLogin");
                      setSelectedCategory("login");
                    }}
                    className={`flex-1 rounded-xl py-2 text-[11px] font-black transition ${
                      pageScope === "postLogin"
                        ? "bg-white text-[#B8844F] shadow-sm"
                        : "text-[#8A7B69]"
                    }`}
                  >
                    אחרי התחברות
                  </button>
                </div>
                {pageScope === "postLogin" && (
                  <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#8A7B69]">
                    התחברות, הרשמה ואזור אישי — מחוברים אוטומטית לנתיב הנכון
                  </p>
                )}
              </div>

              <nav className="flex-1 overflow-y-auto p-2">
                {pageCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-sm font-black transition ${
                      selectedCategory === cat.id
                        ? "bg-[#FFF9EF] text-[#B8844F]"
                        : "text-[#5C4F42] hover:bg-[#FFFCF7]"
                    }`}
                  >
                    <span>
                      {"icon" in cat ? `${cat.icon} ` : ""}
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-bold text-[#B5A593]">
                      10
                    </span>
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* Main content */}
          <main className="min-w-0 flex-1 overflow-y-auto p-5">
            {activeTab === "pages" && (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-black text-[#241A14]">
                    {pageScope === "public"
                      ? `ספריית עמודים — ${
                          PUBLIC_PAGE_CATEGORIES.find(
                            (c) => c.id === selectedCategory
                          )?.label || ""
                        }`
                      : `עמודים אחרי התחברות — ${
                          POST_LOGIN_PAGE_TYPES.find(
                            (t) => t.id === selectedCategory
                          )?.label || ""
                        }`}
                  </h3>
                  {pageScope === "postLogin" && (
                    <p className="mt-1 text-xs font-bold text-[#8A7B69]">
                      {POST_LOGIN_PAGE_TYPES.find(
                        (t) => t.id === selectedCategory
                      )?.description || ""}
                    </p>
                  )}
                </div>

                {filteredPageTemplates.length === 0 ? (
                  <p className="py-12 text-center text-sm font-bold text-[#8A7B69]">
                    לא נמצאו תבניות
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredPageTemplates.map((template) => (
                      <TemplatePreviewCard
                        key={template.id}
                        template={template}
                        onAdd={handleAddPage}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "sections" && (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-black text-[#241A14]">
                    ספריית סקשנים
                  </h3>
                  <p className="mt-1 text-xs font-bold text-[#8A7B69]">
                    הוסיפו סקשנים לעמוד — כולל טפסי התחברות/הרשמה ואזור אישי
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSections.map((section) => (
                    <SectionPreviewCard
                      key={section.id}
                      section={section}
                      onAdd={handleAddSection}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab !== "pages" && activeTab !== "sections" && (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <p className="text-4xl">
                  {SIDEBAR_TABS.find((t) => t.id === activeTab)?.icon}
                </p>
                <h3 className="mt-4 text-lg font-black text-[#241A14]">
                  {SIDEBAR_TABS.find((t) => t.id === activeTab)?.label}
                </h3>
                <p className="mt-2 max-w-sm text-sm font-bold text-[#8A7B69]">
                  {activeTab === "elements"
                    ? "אלמנטים לעיצוב העמוד — בקרוב"
                    : activeTab === "plugins"
                      ? "פלאגינים — בקרוב"
                      : activeTab === "icons"
                        ? "ספריית אייקונים — בקרוב"
                        : activeTab === "animations"
                          ? "אנימציות — בקרוב"
                          : "ספריית מדיה — בקרוב"}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
