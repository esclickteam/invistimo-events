"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Eye,
  GripVertical,
  Layers3,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";

type Dish = {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
};

type MenuCategory = {
  id: string;
  title: string;
  subtitle: string;
  minChoices: number;
  maxChoices: number;
  dishes: Dish[];
};

type HallMenuTemplate = {
  id: string;
  _id?: string;
  name: string;
  description: string;
  type: string;
  status: "active" | "draft";
  categories: MenuCategory[];
  updatedAt: string;
  createdAt?: string;
};

type HallData = {
  id: string;
  name: string;
  subtitle?: string;
  capacity?: number;
  status?: string;
  image?: string;
};

type NewMenuForm = {
  name: string;
  description: string;
  type: string;
  status: "active" | "draft";
};

type NewCategoryForm = {
  title: string;
  subtitle: string;
  minChoices: string;
  maxChoices: string;
};

type NewDishForm = {
  name: string;
  description: string;
  image: string;
  tags: string;
};

function makeLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toNumber(value: string | number, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMenu(menu: any): HallMenuTemplate {
  return {
    id: String(menu.id || menu._id || makeLocalId("menu")),
    _id: menu._id ? String(menu._id) : undefined,
    name: String(menu.name || "תפריט ללא שם"),
    description: String(menu.description || ""),
    type: String(menu.type || ""),
    status: menu.status === "active" ? "active" : "draft",
    categories: Array.isArray(menu.categories) ? menu.categories : [],
    updatedAt: String(menu.updatedAt || ""),
    createdAt: menu.createdAt,
  };
}

function createEmptyCategory(): MenuCategory {
  return {
    id: makeLocalId("cat"),
    title: "ראשונות",
    subtitle: "מנות לבחירה",
    minChoices: 1,
    maxChoices: 3,
    dishes: [],
  };
}

export default function HallMenusPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [hall, setHall] = useState<HallData | null>(null);
  const [templates, setTemplates] = useState<HallMenuTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [dishLibrary, setDishLibrary] = useState<Dish[]>([]);
  const [draggedDish, setDraggedDish] = useState<Dish | null>(null);

  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newDishOpen, setNewDishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [newMenuForm, setNewMenuForm] = useState<NewMenuForm>({
    name: "",
    description: "",
    type: "",
    status: "draft",
  });

  const [newCategoryForm, setNewCategoryForm] = useState<NewCategoryForm>({
    title: "",
    subtitle: "",
    minChoices: "1",
    maxChoices: "3",
  });

  const [newDishForm, setNewDishForm] = useState<NewDishForm>({
    name: "",
    description: "",
    image: "",
    tags: "",
  });

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ||
    templates[0] ||
    null;

  const selectedCategory =
    selectedTemplate?.categories.find(
      (category) => category.id === selectedCategoryId
    ) ||
    selectedTemplate?.categories[0] ||
    null;

  const stats = useMemo(() => {
    const categoriesCount = selectedTemplate?.categories.length || 0;
    const dishesCount =
      selectedTemplate?.categories.reduce(
        (sum, category) => sum + category.dishes.length,
        0
      ) || 0;

    return {
      templates: templates.length,
      activeTemplates: templates.filter(
        (template) => template.status === "active"
      ).length,
      categoriesCount,
      dishesCount,
    };
  }, [selectedTemplate, templates]);

  const fetchMenus = async () => {
    if (!hallId) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${hallId}/menus`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת התפריטים נכשלה");
      }

      const nextMenus = Array.isArray(data.menus)
        ? data.menus.map(normalizeMenu)
        : [];

      setHall(data.hall || null);
      setTemplates(nextMenus);

      if (nextMenus.length > 0) {
        setSelectedTemplateId((current) => {
          const stillExists = nextMenus.some(
            (menu: HallMenuTemplate) => menu.id === current
          );
          return stillExists ? current : nextMenus[0].id;
        });

        setSelectedCategoryId((current) => {
          const firstMenu = nextMenus[0];
          const allCategories = nextMenus.flatMap(
            (menu: HallMenuTemplate) => menu.categories
          );
          const stillExists = allCategories.some(
            (category: MenuCategory) => category.id === current
          );

          return stillExists ? current : firstMenu.categories[0]?.id || "";
        });
      } else {
        setSelectedTemplateId("");
        setSelectedCategoryId("");
      }
    } catch (error) {
      console.error("GET menus failed:", error);
      setServerError(
        error instanceof Error ? error.message : "טעינת התפריטים נכשלה"
      );
      setHall(null);
      setTemplates([]);
      setSelectedTemplateId("");
      setSelectedCategoryId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallId]);

  const saveMenuToServer = async (menu: HallMenuTemplate) => {
    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${hallId}/menus`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          menuId: menu._id || menu.id,
          name: menu.name,
          description: menu.description,
          type: menu.type,
          status: menu.status,
          categories: menu.categories,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "שמירת התפריט נכשלה");
      }

      const savedMenu = normalizeMenu(data.menu);

      setTemplates((current) =>
        current.map((template) =>
          template.id === menu.id ? savedMenu : template
        )
      );

      setSelectedTemplateId(savedMenu.id);
      setSelectedCategoryId((current) => current || savedMenu.categories[0]?.id || "");
    } catch (error) {
      console.error("PUT menu failed:", error);
      setServerError(
        error instanceof Error ? error.message : "שמירת התפריט נכשלה"
      );
    } finally {
      setSaving(false);
    }
  };

  const createMenu = async () => {
    if (!newMenuForm.name.trim()) {
      alert("חובה להזין שם תפריט");
      return;
    }

    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${hallId}/menus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newMenuForm.name,
          description: newMenuForm.description,
          type: newMenuForm.type,
          status: newMenuForm.status,
          categories: [createEmptyCategory()],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "יצירת התפריט נכשלה");
      }

      const menu = normalizeMenu(data.menu);

      setTemplates((current) => [menu, ...current]);
      setSelectedTemplateId(menu.id);
      setSelectedCategoryId(menu.categories[0]?.id || "");

      setNewMenuOpen(false);
      setNewMenuForm({
        name: "",
        description: "",
        type: "",
        status: "draft",
      });
    } catch (error) {
      console.error("POST menu failed:", error);
      setServerError(
        error instanceof Error ? error.message : "יצירת התפריט נכשלה"
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicateMenu = async (template: HallMenuTemplate) => {
    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${hallId}/menus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: `${template.name} - עותק`,
          description: template.description,
          type: template.type,
          status: "draft",
          categories: template.categories.map((category) => ({
            ...category,
            id: makeLocalId("cat"),
            dishes: category.dishes.map((dish) => ({
              ...dish,
              id: makeLocalId("dish"),
            })),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "שכפול התפריט נכשל");
      }

      const menu = normalizeMenu(data.menu);

      setTemplates((current) => [menu, ...current]);
      setSelectedTemplateId(menu.id);
      setSelectedCategoryId(menu.categories[0]?.id || "");
    } catch (error) {
      console.error("duplicate menu failed:", error);
      setServerError(
        error instanceof Error ? error.message : "שכפול התפריט נכשל"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteMenu = async (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);

    if (!template) return;

    const ok = window.confirm("למחוק את התפריט הזה?");
    if (!ok) return;

    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${hallId}/menus?menuId=${encodeURIComponent(
          template._id || template.id
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "מחיקת התפריט נכשלה");
      }

      const nextTemplates = templates.filter((item) => item.id !== templateId);

      setTemplates(nextTemplates);

      if (selectedTemplateId === templateId) {
        const next = nextTemplates[0] || null;
        setSelectedTemplateId(next?.id || "");
        setSelectedCategoryId(next?.categories[0]?.id || "");
      }
    } catch (error) {
      console.error("DELETE menu failed:", error);
      setServerError(
        error instanceof Error ? error.message : "מחיקת התפריט נכשלה"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (
    templateId: string,
    patch: Partial<HallMenuTemplate>
  ) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId
          ? { ...template, ...patch, updatedAt: "עודכן עכשיו" }
          : template
      )
    );
  };

  const updateCategory = (categoryId: string, patch: Partial<MenuCategory>) => {
    if (!selectedTemplate) return;

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              updatedAt: "עודכן עכשיו",
              categories: template.categories.map((category) =>
                category.id === categoryId ? { ...category, ...patch } : category
              ),
            }
          : template
      )
    );
  };

  const addCategory = () => {
    if (!selectedTemplate) return;

    const title = newCategoryForm.title.trim() || "קטגוריה חדשה";
    const subtitle = newCategoryForm.subtitle.trim();

    const minChoices = Math.max(0, toNumber(newCategoryForm.minChoices, 1));
    const maxChoices = Math.max(
      minChoices,
      toNumber(newCategoryForm.maxChoices, minChoices || 1)
    );

    const id = makeLocalId("cat");

    const nextCategory: MenuCategory = {
      id,
      title,
      subtitle,
      minChoices,
      maxChoices,
      dishes: [],
    };

    updateTemplate(selectedTemplate.id, {
      categories: [...selectedTemplate.categories, nextCategory],
    });

    setSelectedCategoryId(id);
    setNewCategoryOpen(false);
    setNewCategoryForm({
      title: "",
      subtitle: "",
      minChoices: "1",
      maxChoices: "3",
    });
  };

  const deleteCategory = (categoryId: string) => {
    if (!selectedTemplate) return;

    const nextCategories = selectedTemplate.categories.filter(
      (category) => category.id !== categoryId
    );

    updateTemplate(selectedTemplate.id, {
      categories: nextCategories,
    });

    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(nextCategories[0]?.id || "");
    }
  };

  const addDishToCategory = (dish: Dish) => {
    if (!selectedCategory) return;

    const exists = selectedCategory.dishes.some((item) => item.id === dish.id);
    if (exists) return;

    updateCategory(selectedCategory.id, {
      dishes: [...selectedCategory.dishes, dish],
    });
  };

  const removeDishFromCategory = (dishId: string) => {
    if (!selectedCategory) return;

    updateCategory(selectedCategory.id, {
      dishes: selectedCategory.dishes.filter((dish) => dish.id !== dishId),
    });
  };

  const addCustomDish = () => {
    const name = newDishForm.name.trim();

    if (!name) {
      alert("חובה להזין שם מנה");
      return;
    }

    const tags = newDishForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const newDish: Dish = {
      id: makeLocalId("dish"),
      name,
      description: newDishForm.description.trim(),
      image: newDishForm.image.trim(),
      tags,
    };

    setDishLibrary((current) => [newDish, ...current]);
    addDishToCategory(newDish);

    setNewDishOpen(false);
    setNewDishForm({
      name: "",
      description: "",
      image: "",
      tags: "",
    });
  };

  const saveSelectedMenu = () => {
    if (!selectedTemplate) return;
    saveMenuToServer(selectedTemplate);
  };

  const hasTemplates = templates.length > 0;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>ניהול אולם</span>
                <span>›</span>
                <span>{hall?.name || "אולם"}</span>
                <span>›</span>
                <span>תפריטים</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                  <Utensils size={32} />
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                    ניהול תפריטי אולם
                  </h1>
                  <p className="mt-2 text-sm font-bold text-[#7f705d]">
                    כאן האולם בונה תפריטי בסיס אמיתיים. כל תפריט נשמר במונגו,
                    וניתן לשייך אותו בהמשך לאירוע ולשלוח ללקוח בחירת מנות.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/venues/dashboard/halls/${hallId}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <ArrowRight size={17} />
                חזרה לאולם
              </Link>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!selectedTemplate}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Eye size={17} />
                תצוגה מקדימה
              </button>

              <button
                type="button"
                onClick={() => setNewMenuOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9]"
              >
                <Plus size={17} />
                תפריט חדש
              </button>

              <button
                type="button"
                onClick={saveSelectedMenu}
                disabled={!selectedTemplate || saving}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                שמירת תפריט
              </button>
            </div>
          </div>

          {serverError ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {serverError}
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="תפריטים באולם"
            value={loading ? "..." : `${stats.templates}`}
            subtitle="תפריטי בסיס קבועים"
          />
          <MetricCard
            title="תפריטים פעילים"
            value={loading ? "..." : `${stats.activeTemplates}`}
            subtitle="זמינים לבחירה באירוע"
          />
          <MetricCard
            title="קטגוריות בתפריט"
            value={loading ? "..." : `${stats.categoriesCount}`}
            subtitle="ראשונות / עיקריות / בופה..."
          />
          <MetricCard
            title="מנות בתפריט"
            value={loading ? "..." : `${stats.dishesCount}`}
            subtitle="סה״כ מנות בתפריט הנבחר"
          />
        </section>

        {!hasTemplates && !loading ? (
          <section className="mt-5 rounded-[34px] border border-dashed border-[#d9bd83] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
              <Utensils size={32} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-[#2b241c]">
              עדיין אין תפריטים באולם הזה
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
              צרי תפריט בסיס ראשון, הוסיפי קטגוריות ומנות, ושמרי. אחרי רענון
              התפריט יישאר כי הוא נשמר במונגו.
            </p>

            <button
              type="button"
              onClick={() => setNewMenuOpen(true)}
              className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <Plus size={17} />
              צור תפריט ראשון
            </button>
          </section>
        ) : null}

        {hasTemplates ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[310px_1fr_350px]">
            <aside className="space-y-5">
              <Panel title="תפריטי האולם" icon={<Layers3 size={18} />}>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setSelectedCategoryId(template.categories[0]?.id || "");
                      }}
                      className={[
                        "w-full rounded-[24px] border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm",
                        selectedTemplateId === template.id
                          ? "border-[#d9bd83] bg-[#fff8eb]"
                          : "border-[#eadfce] bg-[#fffdf8]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-[#2b241c]">
                            {template.name}
                          </div>
                          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                            {template.type || "ללא סוג"} ·{" "}
                            {template.updatedAt || "לא עודכן"}
                          </div>
                        </div>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-black",
                            template.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {template.status === "active" ? "פעיל" : "טיוטה"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <InfoPill
                          label="קטגוריות"
                          value={`${template.categories.length}`}
                        />
                        <InfoPill
                          label="מנות"
                          value={`${template.categories.reduce(
                            (sum, category) => sum + category.dishes.length,
                            0
                          )}`}
                        />
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setNewMenuOpen(true)}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
                >
                  <Plus size={16} />
                  הוספת תפריט
                </button>
              </Panel>

              <Panel title="ספריית מנות זמנית" icon={<BookOpen size={18} />}>
                <div className="mb-3 flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3">
                  <Search size={16} className="text-[#a2937f]" />
                  <input
                    placeholder="חיפוש מנה..."
                    className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#b7a895]"
                  />
                </div>

                <div className="space-y-2">
                  {dishLibrary.length ? (
                    dishLibrary.map((dish) => (
                      <DishLibraryItem
                        key={dish.id}
                        dish={dish}
                        onDragStart={() => setDraggedDish(dish)}
                        onAdd={() => addDishToCategory(dish)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4 text-center text-sm font-bold leading-6 text-[#8a7b68]">
                      אין עדיין מנות בספרייה. הוסיפי מנה חדשה והיא תישמר בתוך
                      התפריט בעת שמירה.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setNewDishOpen(true)}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
                >
                  <Plus size={16} />
                  הוספת מנה חדשה
                </button>
              </Panel>
            </aside>

            {selectedTemplate ? (
              <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
                <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_220px_160px]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                      שם התפריט
                    </span>
                    <input
                      value={selectedTemplate.name}
                      onChange={(event) =>
                        updateTemplate(selectedTemplate.id, {
                          name: event.target.value,
                        })
                      }
                      className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                      סוג תפריט
                    </span>
                    <input
                      value={selectedTemplate.type}
                      onChange={(event) =>
                        updateTemplate(selectedTemplate.id, {
                          type: event.target.value,
                        })
                      }
                      className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      updateTemplate(selectedTemplate.id, {
                        status:
                          selectedTemplate.status === "active"
                            ? "draft"
                            : "active",
                      })
                    }
                    className={[
                      "mt-auto h-12 rounded-2xl text-sm font-black",
                      selectedTemplate.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {selectedTemplate.status === "active" ? "פעיל" : "טיוטה"}
                  </button>
                </div>

                <label className="mb-5 block">
                  <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                    תיאור התפריט
                  </span>
                  <textarea
                    value={selectedTemplate.description}
                    onChange={(event) =>
                      updateTemplate(selectedTemplate.id, {
                        description: event.target.value,
                      })
                    }
                    className="min-h-[80px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[#2b241c] outline-none focus:border-[#b98121]"
                  />
                </label>

                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedTemplate.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={[
                        "flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-black transition",
                        selectedCategoryId === category.id
                          ? "border-[#b98121] bg-[#b98121] text-white"
                          : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fbf5ea]",
                      ].join(" ")}
                    >
                      {category.title}
                      <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px]">
                        {category.minChoices}/{category.maxChoices}
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setNewCategoryOpen(true)}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a]"
                  >
                    <Plus size={16} />
                    קטגוריה
                  </button>
                </div>

                {selectedCategory ? (
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedDish) addDishToCategory(draggedDish);
                      setDraggedDish(null);
                    }}
                    className="rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={selectedCategory.title}
                            onChange={(event) =>
                              updateCategory(selectedCategory.id, {
                                title: event.target.value,
                              })
                            }
                            className="h-10 rounded-2xl border border-[#eadfce] bg-white px-3 text-xl font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                          />

                          <span className="rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
                            בחירה של {selectedCategory.minChoices} מתוך{" "}
                            {selectedCategory.maxChoices}
                          </span>
                        </div>

                        <input
                          value={selectedCategory.subtitle}
                          onChange={(event) =>
                            updateCategory(selectedCategory.id, {
                              subtitle: event.target.value,
                            })
                          }
                          className="mt-2 h-9 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#8a7b68] outline-none focus:border-[#b98121]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <SmallNumberInput
                          label="מינימום"
                          value={selectedCategory.minChoices}
                          onChange={(value) =>
                            updateCategory(selectedCategory.id, {
                              minChoices: value,
                            })
                          }
                        />

                        <SmallNumberInput
                          label="מקסימום"
                          value={selectedCategory.maxChoices}
                          onChange={(value) =>
                            updateCategory(selectedCategory.id, {
                              maxChoices: value,
                            })
                          }
                        />

                        <button
                          type="button"
                          onClick={() => deleteCategory(selectedCategory.id)}
                          className="flex h-10 items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-700"
                        >
                          <Trash2 size={15} />
                          מחיקה
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 rounded-2xl border border-[#eadfce] bg-white p-3 text-center text-sm font-bold text-[#8a7b68]">
                      גררי מנה מספריית המנות לכאן, או לחצי על “הוספה” ליד מנה.
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {selectedCategory.dishes.map((dish, index) => (
                        <MenuDishCard
                          key={dish.id}
                          dish={dish}
                          index={index + 1}
                          onRemove={() => removeDishFromCategory(dish.id)}
                        />
                      ))}

                      {selectedCategory.dishes.length === 0 ? (
                        <div className="col-span-full rounded-[24px] border border-dashed border-[#d9bd83] bg-white p-8 text-center">
                          <Utensils
                            className="mx-auto text-[#b98121]"
                            size={30}
                          />
                          <div className="mt-3 text-lg font-black text-[#2b241c]">
                            אין עדיין מנות בקטגוריה
                          </div>
                          <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                            הוסיפי מנה חדשה או גררי מנה מהספרייה.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-8 text-center">
                    <div className="text-xl font-black text-[#2b241c]">
                      אין קטגוריות בתפריט
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCategoryOpen(true)}
                      className="mt-4 rounded-2xl bg-[#b98121] px-5 py-3 text-sm font-black text-white"
                    >
                      הוספת קטגוריה
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            <aside className="space-y-5">
              <Panel title="פעולות תפריט" icon={<Sparkles size={18} />}>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={saveSelectedMenu}
                    disabled={!selectedTemplate || saving}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    שמירת תפריט
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectedTemplate && duplicateMenu(selectedTemplate)
                    }
                    disabled={!selectedTemplate || saving}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy size={16} />
                    שכפול תפריט
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    disabled={!selectedTemplate}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Eye size={16} />
                    תצוגה מקדימה
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectedTemplate && deleteMenu(selectedTemplate.id)
                    }
                    disabled={!selectedTemplate || saving}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    מחיקת תפריט
                  </button>
                </div>
              </Panel>

              <Panel title="שימוש באירועים" icon={<CheckCircle2 size={18} />}>
                <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                  <div className="text-sm font-black text-[#2b241c]">
                    התפריט הזה הוא תפריט בסיס של האולם
                  </div>
                  <p className="mt-2 text-xs font-bold leading-6 text-[#7f705d]">
                    מתוך עמוד אירוע נבחר תפריט, ואז המערכת תיצור עותק לאירוע
                    הספציפי. הבחירות של הלקוח יתעדכנו רק בעותק של האירוע.
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  <InfoLine label="אירועים שמשתמשים בו" value="0" />
                  <InfoLine
                    label="עודכן לאחרונה"
                    value={selectedTemplate?.updatedAt || "לא עודכן"}
                  />
                  <InfoLine
                    label="סטטוס"
                    value={
                      selectedTemplate?.status === "active" ? "פעיל" : "טיוטה"
                    }
                  />
                </div>
              </Panel>

              <Panel title="העלאת תפריט קיים" icon={<Upload size={18} />}>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5 text-center transition hover:bg-[#f4ead9]">
                  <Upload size={24} className="text-[#b98121]" />
                  <div className="mt-2 text-sm font-black text-[#2b241c]">
                    העלאת PDF / תמונה
                  </div>
                  <div className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
                    כרגע זה רק בחירת קובץ מקומית. בהמשך נחבר העלאה אמיתית
                    לשרת/Cloudinary.
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setUploadedFileName(file.name);
                    }}
                  />
                </label>

                {uploadedFileName ? (
                  <div className="mt-3 rounded-2xl bg-[#f4ead9] px-3 py-2 text-xs font-black text-[#b98121]">
                    קובץ נבחר: {uploadedFileName}
                  </div>
                ) : null}
              </Panel>
            </aside>
          </section>
        ) : null}
      </div>

      {newMenuOpen && (
        <Modal title="הוספת תפריט חדש" onClose={() => setNewMenuOpen(false)}>
          <div className="grid gap-3">
            <FormInput
              label="שם תפריט"
              value={newMenuForm.name}
              onChange={(value) =>
                setNewMenuForm((prev) => ({ ...prev, name: value }))
              }
            />
            <FormInput
              label="סוג תפריט"
              value={newMenuForm.type}
              onChange={(value) =>
                setNewMenuForm((prev) => ({ ...prev, type: value }))
              }
            />
            <FormInput
              label="תיאור קצר"
              value={newMenuForm.description}
              onChange={(value) =>
                setNewMenuForm((prev) => ({ ...prev, description: value }))
              }
            />

            <label>
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                סטטוס
              </span>
              <select
                value={newMenuForm.status}
                onChange={(event) =>
                  setNewMenuForm((prev) => ({
                    ...prev,
                    status: event.target.value as "active" | "draft",
                  }))
                }
                className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              >
                <option value="draft">טיוטה</option>
                <option value="active">פעיל</option>
              </select>
            </label>

            <button
              type="button"
              onClick={createMenu}
              disabled={saving}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              יצירת תפריט
            </button>
          </div>
        </Modal>
      )}

      {newCategoryOpen && (
        <Modal title="הוספת קטגוריה" onClose={() => setNewCategoryOpen(false)}>
          <div className="grid gap-3">
            <FormInput
              label="שם קטגוריה"
              value={newCategoryForm.title}
              onChange={(value) =>
                setNewCategoryForm((prev) => ({ ...prev, title: value }))
              }
            />
            <FormInput
              label="תיאור קצר"
              value={newCategoryForm.subtitle}
              onChange={(value) =>
                setNewCategoryForm((prev) => ({ ...prev, subtitle: value }))
              }
            />
            <FormInput
              label="כמה מינימום לבחור"
              type="number"
              value={newCategoryForm.minChoices}
              onChange={(value) =>
                setNewCategoryForm((prev) => ({
                  ...prev,
                  minChoices: value,
                }))
              }
            />
            <FormInput
              label="כמה מקסימום לבחור"
              type="number"
              value={newCategoryForm.maxChoices}
              onChange={(value) =>
                setNewCategoryForm((prev) => ({
                  ...prev,
                  maxChoices: value,
                }))
              }
            />

            <button
              type="button"
              onClick={addCategory}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              הוספת קטגוריה
            </button>
          </div>
        </Modal>
      )}

      {newDishOpen && (
        <Modal title="הוספת מנה חדשה" onClose={() => setNewDishOpen(false)}>
          <div className="grid gap-3">
            <FormInput
              label="שם מנה"
              value={newDishForm.name}
              onChange={(value) =>
                setNewDishForm((prev) => ({ ...prev, name: value }))
              }
            />
            <FormInput
              label="תיאור"
              value={newDishForm.description}
              onChange={(value) =>
                setNewDishForm((prev) => ({ ...prev, description: value }))
              }
            />
            <FormInput
              label="קישור תמונה"
              value={newDishForm.image}
              onChange={(value) =>
                setNewDishForm((prev) => ({ ...prev, image: value }))
              }
            />
            <FormInput
              label="תגיות מופרדות בפסיקים"
              value={newDishForm.tags}
              onChange={(value) =>
                setNewDishForm((prev) => ({ ...prev, tags: value }))
              }
            />

            <button
              type="button"
              onClick={addCustomDish}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              הוספת מנה לקטגוריה
            </button>
          </div>
        </Modal>
      )}

      {previewOpen && selectedTemplate && (
        <Modal
          title={`תצוגה מקדימה - ${selectedTemplate.name}`}
          onClose={() => setPreviewOpen(false)}
          wide
        >
          <div className="space-y-5">
            <div className="rounded-[26px] border border-[#eadfce] bg-[#fff8eb] p-5 text-center">
              <h2 className="text-2xl font-black text-[#2b241c]">
                {selectedTemplate.name}
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                {selectedTemplate.description || "אין תיאור לתפריט"}
              </p>
            </div>

            {selectedTemplate.categories.length ? (
              selectedTemplate.categories.map((category) => (
                <section
                  key={category.id}
                  className="rounded-[26px] border border-[#eadfce] bg-white p-4"
                >
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#2b241c]">
                        {category.title}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                        {category.subtitle}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
                      בחירה של {category.minChoices} מתוך {category.maxChoices}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {category.dishes.length ? (
                      category.dishes.map((dish) => (
                        <div
                          key={dish.id}
                          className="flex items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3"
                        >
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="h-14 w-14 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                              <Utensils size={20} />
                            </div>
                          )}

                          <div>
                            <div className="text-sm font-black text-[#2b241c]">
                              {dish.name}
                            </div>
                            <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
                              {dish.description || "אין תיאור מנה"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4 text-center text-sm font-bold text-[#8a7b68]">
                        אין מנות בקטגוריה הזאת
                      </div>
                    )}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4 text-center text-sm font-bold text-[#8a7b68]">
                אין קטגוריות בתפריט הזה
              </div>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="text-sm font-black text-[#8a7b68]">{title}</div>
      <div className="mt-2 text-3xl font-black text-[#2b241c]">{value}</div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">{subtitle}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DishLibraryItem({
  dish,
  onDragStart,
  onAdd,
}: {
  dish: Dish;
  onDragStart: () => void;
  onAdd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-2 active:cursor-grabbing"
    >
      <GripVertical size={17} className="text-[#b7a895]" />

      {dish.image ? (
        <img
          src={dish.image}
          alt={dish.name}
          className="h-12 w-12 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4ead9] text-[#b98121]">
          <Utensils size={18} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-[#2b241c]">
          {dish.name}
        </div>
        <div className="truncate text-xs font-bold text-[#8a7b68]">
          {dish.tags.length ? dish.tags.join(" · ") : "ללא תגיות"}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="rounded-xl bg-[#f4ead9] px-2 py-1 text-xs font-black text-[#b98121]"
      >
        הוספה
      </button>
    </div>
  );
}

function MenuDishCard({
  dish,
  index,
  onRemove,
}: {
  dish: Dish;
  index: number;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#eadfce] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f4ead9] text-xs font-black text-[#b98121]">
          {index}
        </div>

        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
            <Utensils size={22} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-black text-[#2b241c]">
            {dish.name}
          </div>
          <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#8a7b68]">
            {dish.description || "אין תיאור מנה"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-3 pb-3">
        {dish.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#fff8eb] px-2.5 py-1 text-[11px] font-black text-[#9f6f1a]"
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#eadfce] bg-white text-sm font-black text-rose-700"
      >
        <Trash2 size={16} />
        הסרה
      </button>
    </article>
  );
}

function SmallNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="w-12 bg-transparent text-center text-sm font-black outline-none"
      />
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span className="text-sm font-black text-[#2b241c]">{value}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2">
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div
        className={[
          "max-h-[92vh] w-full overflow-y-auto rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-2xl",
          wide ? "max-w-6xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#2b241c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}