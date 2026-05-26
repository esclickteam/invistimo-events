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
  _id?: string;
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

const DEFAULT_CATEGORIES: MenuCategory[] = [
  {
    id: makeLocalId("cat"),
    title: "ראשונות",
    subtitle: "מנות פתיחה לבחירת הלקוח",
    minChoices: 1,
    maxChoices: 1,
    dishes: [],
  },
  {
    id: makeLocalId("cat"),
    title: "עיקריות",
    subtitle: "מנות עיקריות לבחירה",
    minChoices: 1,
    maxChoices: 1,
    dishes: [],
  },
  {
    id: makeLocalId("cat"),
    title: "סלטים",
    subtitle: "סלטים ותוספות לשולחן",
    minChoices: 3,
    maxChoices: 3,
    dishes: [],
  },
];

function makeLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDefaultCategories(): MenuCategory[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    id: makeLocalId("cat"),
    dishes: [],
  }));
}

function toNumber(value: string | number, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDish(dish: any): Dish {
  return {
    id: String(dish.id || dish._id || makeLocalId("dish")),
    _id: dish._id ? String(dish._id) : undefined,
    name: String(dish.name || "מנה ללא שם"),
    description: String(dish.description || ""),
    image: String(dish.image || ""),
    tags: Array.isArray(dish.tags) ? dish.tags.map(String) : [],
  };
}

function normalizeCategory(category: any): MenuCategory {
  return {
    id: String(category.id || category._id || makeLocalId("cat")),
    title: String(category.title || "קטגוריה"),
    subtitle: String(category.subtitle || ""),
    minChoices: Number.isFinite(Number(category.minChoices))
      ? Number(category.minChoices)
      : 0,
    maxChoices: Number.isFinite(Number(category.maxChoices))
      ? Number(category.maxChoices)
      : 1,
    dishes: Array.isArray(category.dishes)
      ? category.dishes.map(normalizeDish)
      : [],
  };
}

function normalizeMenu(menu: any): HallMenuTemplate {
  return {
    id: String(menu.id || menu._id || makeLocalId("menu")),
    _id: menu._id ? String(menu._id) : undefined,
    name: String(menu.name || "תפריט ללא שם"),
    description: String(menu.description || ""),
    type: String(menu.type || ""),
    status: menu.status === "active" ? "active" : "draft",
    categories: Array.isArray(menu.categories)
      ? menu.categories.map(normalizeCategory)
      : [],
    updatedAt: String(menu.updatedAt || ""),
    createdAt: menu.createdAt,
  };
}

function createEmptyCategory(): MenuCategory {
  return {
    id: makeLocalId("cat"),
    title: "קטגוריה חדשה",
    subtitle: "מנות לבחירה",
    minChoices: 1,
    maxChoices: 1,
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
  const [dishSearch, setDishSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [librarySaving, setLibrarySaving] = useState(false);

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
    maxChoices: "1",
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

  const filteredDishLibrary = useMemo(() => {
    const query = dishSearch.trim().toLowerCase();
    if (!query) return dishLibrary;

    return dishLibrary.filter((dish) => {
      return (
        dish.name.toLowerCase().includes(query) ||
        dish.description.toLowerCase().includes(query)
      );
    });
  }, [dishLibrary, dishSearch]);

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
      libraryDishes: dishLibrary.length,
    };
  }, [selectedTemplate, templates, dishLibrary]);

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

  const fetchDishLibrary = async () => {
    if (!hallId) return;

    setLibraryLoading(true);

    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${hallId}/menu-dishes`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת ספריית המנות נכשלה");
      }

      setDishLibrary(Array.isArray(data.dishes) ? data.dishes.map(normalizeDish) : []);
    } catch (error) {
      console.error("GET menu-dishes failed:", error);
      setServerError(
        error instanceof Error ? error.message : "טעינת ספריית המנות נכשלה"
      );
      setDishLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
    fetchDishLibrary();
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
      setSelectedCategoryId(
        (current) => current || savedMenu.categories[0]?.id || ""
      );

      return savedMenu;
    } catch (error) {
      console.error("PUT menu failed:", error);
      setServerError(
        error instanceof Error ? error.message : "שמירת התפריט נכשלה"
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const persistTemplate = async (nextTemplate: HallMenuTemplate) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === nextTemplate.id
          ? { ...nextTemplate, updatedAt: "עודכן עכשיו" }
          : template
      )
    );

    return saveMenuToServer({ ...nextTemplate, updatedAt: "עודכן עכשיו" });
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
          categories: cloneDefaultCategories(),
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

  const updateCategoryDraft = (categoryId: string, patch: Partial<MenuCategory>) => {
    if (!selectedTemplate) return;

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              updatedAt: "עודכן עכשיו",
              categories: template.categories.map((category) =>
                category.id === categoryId
                  ? { ...category, ...patch }
                  : category
              ),
            }
          : template
      )
    );
  };

  const saveCategoryChoiceRules = async (categoryId: string) => {
    const template = templates.find((item) => item.id === selectedTemplate?.id);
    if (!template) return;
    await persistTemplate(template);
  };

  const addCategory = async () => {
    if (!selectedTemplate) return;

    const title = newCategoryForm.title.trim() || "קטגוריה חדשה";
    const subtitle = newCategoryForm.subtitle.trim() || "מנות לבחירה";

    const choicesCount = Math.max(0, toNumber(newCategoryForm.maxChoices, 1));

    const id = makeLocalId("cat");

    const nextCategory: MenuCategory = {
      id,
      title,
      subtitle,
      minChoices: choicesCount,
      maxChoices: choicesCount,
      dishes: [],
    };

    const nextTemplate: HallMenuTemplate = {
      ...selectedTemplate,
      categories: [...selectedTemplate.categories, nextCategory],
      updatedAt: "עודכן עכשיו",
    };

    setSelectedCategoryId(id);
    setNewCategoryOpen(false);
    setNewCategoryForm({
      title: "",
      subtitle: "",
      minChoices: "1",
      maxChoices: "1",
    });

    await persistTemplate(nextTemplate);
  };

  const deleteCategory = async (categoryId: string) => {
    if (!selectedTemplate) return;

    const ok = window.confirm("למחוק את הקטגוריה הזאת מהתפריט?");
    if (!ok) return;

    const nextCategories = selectedTemplate.categories.filter(
      (category) => category.id !== categoryId
    );

    const nextTemplate: HallMenuTemplate = {
      ...selectedTemplate,
      categories: nextCategories,
      updatedAt: "עודכן עכשיו",
    };

    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(nextCategories[0]?.id || "");
    }

    await persistTemplate(nextTemplate);
  };

  const addDishToCategory = async (dish: Dish) => {
    if (!selectedTemplate || !selectedCategory) return;

    const exists = selectedCategory.dishes.some((item) => item.id === dish.id);
    if (exists) return;

    const nextDish: Dish = {
      ...dish,
      id: dish.id || dish._id || makeLocalId("dish"),
      tags: [],
    };

    const nextCategories = selectedTemplate.categories.map((category) =>
      category.id === selectedCategory.id
        ? { ...category, dishes: [...category.dishes, nextDish] }
        : category
    );

    const nextTemplate: HallMenuTemplate = {
      ...selectedTemplate,
      categories: nextCategories,
      updatedAt: "עודכן עכשיו",
    };

    await persistTemplate(nextTemplate);
  };

  const removeDishFromCategory = async (dishId: string) => {
    if (!selectedTemplate || !selectedCategory) return;

    const nextCategories = selectedTemplate.categories.map((category) =>
      category.id === selectedCategory.id
        ? {
            ...category,
            dishes: category.dishes.filter((dish) => dish.id !== dishId),
          }
        : category
    );

    const nextTemplate: HallMenuTemplate = {
      ...selectedTemplate,
      categories: nextCategories,
      updatedAt: "עודכן עכשיו",
    };

    await persistTemplate(nextTemplate);
  };

  const addCustomDish = async () => {
    const name = newDishForm.name.trim();

    if (!name) {
      alert("חובה להזין שם מנה");
      return;
    }

    setLibrarySaving(true);
    setServerError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${hallId}/menu-dishes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            description: newDishForm.description.trim(),
            image: newDishForm.image.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "שמירת המנה בספרייה נכשלה");
      }

      const savedDish = normalizeDish(data.dish);

      setDishLibrary((current) => [savedDish, ...current]);
      setNewDishOpen(false);
      setNewDishForm({
        name: "",
        description: "",
        image: "",
        tags: "",
      });

      if (selectedCategory) {
        await addDishToCategory(savedDish);
      }
    } catch (error) {
      console.error("POST menu-dishes failed:", error);
      setServerError(
        error instanceof Error ? error.message : "שמירת המנה בספרייה נכשלה"
      );
    } finally {
      setLibrarySaving(false);
    }
  };

  const deleteDishFromLibrary = async (dish: Dish) => {
    const ok = window.confirm(
      "למחוק את המנה מספריית המנות הקבועה? זה לא מוחק אותה מתפריטים שכבר השתמשו בה."
    );
    if (!ok) return;

    setLibrarySaving(true);
    setServerError("");

    try {
      const dishId = dish._id || dish.id;
      const res = await fetch(
        `/api/venues/dashboard/halls/${hallId}/menu-dishes?dishId=${encodeURIComponent(
          dishId
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "מחיקת המנה נכשלה");
      }

      setDishLibrary((current) =>
        current.filter((item) => (item._id || item.id) !== dishId)
      );
    } catch (error) {
      console.error("DELETE menu-dishes failed:", error);
      setServerError(
        error instanceof Error ? error.message : "מחיקת המנה נכשלה"
      );
    } finally {
      setLibrarySaving(false);
    }
  };

  const handleDishImageUpload = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("אפשר להעלות רק קובץ תמונה");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setNewDishForm((prev) => ({
        ...prev,
        image: String(reader.result || ""),
      }));
    };

    reader.readAsDataURL(file);
  };

  const saveSelectedMenu = () => {
    if (!selectedTemplate) return;
    saveMenuToServer(selectedTemplate);
  };

  const hasTemplates = templates.length > 0;

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#f7f0e3] text-[#2d2419]"
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(205,154,62,0.18),transparent_28%),radial-gradient(circle_at_10%_22%,rgba(255,255,255,0.75),transparent_32%),linear-gradient(180deg,#fbf7f0_0%,#f7f0e3_42%,#f6efe3_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[240px] bg-[linear-gradient(180deg,rgba(111,74,21,0.08)_0%,rgba(205,154,62,0.06)_35%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto max-w-[1840px] px-4 py-5 md:px-7">
        <header className="mb-5 overflow-hidden rounded-[38px] border border-[#e5d2ad] bg-[#faf5ea]/96 p-5 shadow-[0_18px_50px_rgba(76,52,21,0.10)] backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-24 w-64 rounded-br-[70px] bg-[#d5a046]/8 blur-2xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9a7040]">
                <span>ניהול אולם</span>
                <span className="text-[#c29445]">›</span>
                <span>{hall?.name || "אולם"}</span>
                <span className="text-[#c29445]">›</span>
                <span>תפריטי אולם</span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-[#ead7ad] bg-[linear-gradient(145deg,#fff3d7,#d8a241)] text-[#4a3217] shadow-[0_10px_26px_rgba(183,128,31,0.16)]">
                  <div className="absolute inset-2 rounded-[22px] border border-white/45" />
                  <Utensils size={36} />
                </div>

                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#ead7ad] bg-[#fff8ea] px-3 py-1 text-xs font-black text-[#9a6b24]">
                    <Sparkles size={14} />
                    מערכת תפריטים מקצועית לאולמות
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-[#2d2419] md:text-5xl">
                    ניהול תפריטי אולם
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#7c694f]">
                    האולם מעלה ספריית מנות קבועה, ובכל תפריט בוחר מתוך הספרייה
                    אילו מנות להכניס לקטגוריות כמו ראשונות, עיקריות וסלטים.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/venues/dashboard/halls/${hallId}`}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#e2cfac] bg-white px-4 text-sm font-black text-[#6f5736] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff9ee] hover:shadow-md"
              >
                <ArrowRight size={17} />
                חזרה לאולם
              </Link>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!selectedTemplate}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#e2cfac] bg-white px-4 text-sm font-black text-[#6f5736] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff9ee] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Eye size={17} />
                תצוגה מקדימה
              </button>

              <button
                type="button"
                onClick={() => setNewMenuOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d7b06a] bg-[#fff4dc] px-4 text-sm font-black text-[#8c5f19] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffedc9] hover:shadow-md"
              >
                <Plus size={17} />
                תפריט חדש
              </button>

              <button
                type="button"
                onClick={saveSelectedMenu}
                disabled={!selectedTemplate || saving}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(156,101,23,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(156,101,23,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="relative mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {serverError}
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
            subtitle="ראשונות / עיקריות / סלטים"
          />
          <MetricCard
            title="מנות בתפריט"
            value={loading ? "..." : `${stats.dishesCount}`}
            subtitle="מנות ששויכו לתפריט הנבחר"
          />
          <MetricCard
            title="ספריית מנות"
            value={libraryLoading ? "..." : `${stats.libraryDishes}`}
            subtitle="מנות קבועות של האולם"
          />
        </section>

        {!hasTemplates && !loading ? (
          <section className="mt-5 overflow-hidden rounded-[38px] border border-dashed border-[#ddb96f] bg-[#fbf7ef]/96 p-12 text-center shadow-[0_18px_50px_rgba(76,52,21,0.08)] backdrop-blur-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ead7ad] bg-[linear-gradient(145deg,#fff3d7,#d8a241)] text-[#4a3217] shadow-[0_10px_24px_rgba(183,128,31,0.15)]">
              <Utensils size={36} />
            </div>

            <h2 className="mt-5 text-3xl font-black text-[#2d2419]">
              עדיין אין תפריטים באולם הזה
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-[#7c694f]">
              צרי תפריט בסיס ראשון. הוא ייפתח עם ראשונות, עיקריות וסלטים,
              ואפשר יהיה לגרור אליו מנות מתוך ספריית המנות הקבועה.
            </p>

            <button
              type="button"
              onClick={() => setNewMenuOpen(true)}
              className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] px-7 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(156,101,23,0.18)] transition hover:-translate-y-0.5"
            >
              <Plus size={17} />
              צור תפריט ראשון
            </button>
          </section>
        ) : null}

        {hasTemplates ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[330px_1fr_390px]">
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
                        "group w-full rounded-[26px] border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(43,31,16,0.08)]",
                        selectedTemplateId === template.id
                          ? "border-[#d4ab5b] bg-[linear-gradient(135deg,#fff8ea,#f8e7be)] shadow-[0_10px_28px_rgba(183,128,31,0.12)]"
                          : "border-[#eadcc0] bg-[#fffdf9] hover:border-[#d6b26a]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-[#2d2419]">
                            {template.name}
                          </div>
                          <div className="mt-1 text-xs font-bold text-[#8d7654]">
                            {template.type || "ללא סוג"} ·{" "}
                            {template.updatedAt || "לא עודכן"}
                          </div>
                        </div>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm",
                            template.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800",
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
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-sm font-black text-white shadow-[0_10px_22px_rgba(156,101,23,0.18)] transition hover:-translate-y-0.5"
                >
                  <Plus size={16} />
                  הוספת תפריט
                </button>
              </Panel>
            </aside>

            {selectedTemplate ? (
              <section className="overflow-hidden rounded-[38px] border border-[#e7d5b2] bg-[#fbf7ef]/96 p-5 shadow-[0_18px_50px_rgba(76,52,21,0.08)] backdrop-blur-xl">
                <div className="mb-5 rounded-[30px] border border-[#ead7ad] bg-[linear-gradient(135deg,#fff9ee,#f8ead0)] p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_220px_160px]">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black text-[#8d7654]">
                        שם התפריט
                      </span>
                      <input
                        value={selectedTemplate.name}
                        onChange={(event) =>
                          updateTemplate(selectedTemplate.id, {
                            name: event.target.value,
                          })
                        }
                        className="h-12 w-full rounded-2xl border border-[#e2cfac] bg-white px-4 text-sm font-black text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-black text-[#8d7654]">
                        סוג תפריט
                      </span>
                      <input
                        value={selectedTemplate.type}
                        onChange={(event) =>
                          updateTemplate(selectedTemplate.id, {
                            type: event.target.value,
                          })
                        }
                        className="h-12 w-full rounded-2xl border border-[#e2cfac] bg-white px-4 text-sm font-black text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
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
                        "mt-auto h-12 rounded-2xl text-sm font-black shadow-sm transition hover:-translate-y-0.5",
                        selectedTemplate.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      ].join(" ")}
                    >
                      {selectedTemplate.status === "active" ? "פעיל" : "טיוטה"}
                    </button>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-1 block text-xs font-black text-[#8d7654]">
                      תיאור התפריט
                    </span>
                    <textarea
                      value={selectedTemplate.description}
                      onChange={(event) =>
                        updateTemplate(selectedTemplate.id, {
                          description: event.target.value,
                        })
                      }
                      className="min-h-[90px] w-full rounded-2xl border border-[#e2cfac] bg-white p-4 text-sm font-bold leading-7 text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
                    />
                  </label>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedTemplate.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={[
                        "flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
                        selectedCategoryId === category.id
                          ? "border-[#b67b1d] bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-white"
                          : "border-[#e2cfac] bg-white text-[#6f5736] hover:bg-[#fff7e8]",
                      ].join(" ")}
                    >
                      {category.title}
                      <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px]">
                        {category.dishes.length} מנות
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setNewCategoryOpen(true)}
                    className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-[#d7b06a] bg-[#fff4dc] px-4 text-sm font-black text-[#8c5f19] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffedc9]"
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
                    className="rounded-[32px] border border-dashed border-[#d4ab5b] bg-[linear-gradient(180deg,#fffaf1,#fffdfa)] p-4 shadow-inner"
                  >
                    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={selectedCategory.title}
                            onChange={(event) =>
                              updateCategoryDraft(selectedCategory.id, {
                                title: event.target.value,
                              })
                            }
                            onBlur={() => saveCategoryChoiceRules(selectedCategory.id)}
                            className="h-11 rounded-2xl border border-[#e2cfac] bg-white px-4 text-xl font-black text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
                          />

                          <span className="rounded-full border border-[#e2c485] bg-[#fff3d8] px-3 py-1 text-xs font-black text-[#8c5f19]">
                            לבחור {selectedCategory.maxChoices} מתוך {selectedCategory.dishes.length} מנות
                          </span>
                        </div>

                        <input
                          value={selectedCategory.subtitle}
                          onChange={(event) =>
                            updateCategoryDraft(selectedCategory.id, {
                              subtitle: event.target.value,
                            })
                          }
                          onBlur={() => saveCategoryChoiceRules(selectedCategory.id)}
                          className="mt-2 h-10 w-full rounded-2xl border border-[#e2cfac] bg-white px-4 text-sm font-bold text-[#806945] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
                        />
                      </div>

                      <div className="grid gap-3 rounded-[24px] border border-[#ead7ad] bg-white p-3 shadow-sm">
                        <ChoiceNumberInput
                          label="מספר מנות לבחירה"
                          helper={`כמה מנות הלקוח צריך לבחור מתוך ${selectedCategory.dishes.length} מנות`}
                          value={selectedCategory.maxChoices}
                          onChange={(value) =>
                            updateCategoryDraft(selectedCategory.id, {
                              minChoices: value,
                              maxChoices: value,
                            })
                          }
                          onBlur={() => saveCategoryChoiceRules(selectedCategory.id)}
                        />

                        <button
                          type="button"
                          onClick={() => deleteCategory(selectedCategory.id)}
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={15} />
                          מחיקת קטגוריה
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 rounded-2xl border border-[#ead7ad] bg-white p-3 text-center text-sm font-bold text-[#806945]">
                      גררי מנה מתוך ספריית המנות הקבועה בצד שמאל אל הקטגוריה הזאת.
                      כל שינוי נשמר אוטומטית בשרת.
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
                        <div className="col-span-full rounded-[28px] border border-dashed border-[#d7b06a] bg-white p-9 text-center shadow-sm">
                          <Utensils
                            className="mx-auto text-[#b98121]"
                            size={32}
                          />
                          <div className="mt-3 text-xl font-black text-[#2d2419]">
                            אין עדיין מנות בקטגוריה
                          </div>
                          <p className="mt-1 text-sm font-bold text-[#806945]">
                            הוסיפי מנות מהספרייה הקבועה של האולם.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[32px] border border-dashed border-[#d7b06a] bg-[#fff7e7] p-8 text-center">
                    <div className="text-xl font-black text-[#2d2419]">
                      אין קטגוריות בתפריט
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCategoryOpen(true)}
                      className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] px-5 py-3 text-sm font-black text-white"
                    >
                      הוספת קטגוריה
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            <aside className="space-y-5">
              <Panel title="ספריית מנות קבועה" icon={<BookOpen size={18} />}>
                <div className="mb-3 rounded-2xl border border-[#ead7ad] bg-[#fff9ee] p-3 text-xs font-bold leading-6 text-[#806945]">
                  כאן האולם מעלה את כל המנות שלו פעם אחת. בכל תפריט גוררים רק
                  את המנות שרוצים להשתמש בהן.
                </div>

                <div className="mb-3 flex h-12 items-center gap-2 rounded-2xl border border-[#e8d7b6] bg-white px-3 shadow-inner">
                  <Search size={16} className="text-[#b68a40]" />
                  <input
                    value={dishSearch}
                    onChange={(event) => setDishSearch(event.target.value)}
                    placeholder="חיפוש מנה בספרייה..."
                    className="w-full bg-transparent text-sm font-bold text-[#2d2419] outline-none placeholder:text-[#b59f7a]"
                  />
                </div>

                <div className="max-h-[470px] space-y-2 overflow-y-auto pr-1">
                  {libraryLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#ead7ad] bg-white p-4 text-sm font-black text-[#806945]">
                      <Loader2 size={16} className="animate-spin" />
                      טוען ספריית מנות...
                    </div>
                  ) : filteredDishLibrary.length ? (
                    filteredDishLibrary.map((dish) => (
                      <DishLibraryItem
                        key={dish.id}
                        dish={dish}
                        saving={saving || librarySaving}
                        onDragStart={() => setDraggedDish(dish)}
                        onAdd={() => addDishToCategory(dish)}
                        onDelete={() => deleteDishFromLibrary(dish)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#d7b06a] bg-[#fff8ec] p-4 text-center text-sm font-bold leading-6 text-[#806945]">
                      אין עדיין מנות קבועות בספרייה.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setNewDishOpen(true)}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d7b06a] bg-[#fff4dc] text-sm font-black text-[#8c5f19] transition hover:bg-[#ffedc9]"
                >
                  <Plus size={16} />
                  הוספת מנה לספרייה
                </button>
              </Panel>

              <Panel title="פעולות תפריט" icon={<Sparkles size={18} />}>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={saveSelectedMenu}
                    disabled={!selectedTemplate || saving}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-sm font-black text-white shadow-[0_10px_22px_rgba(156,101,23,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e2cfac] bg-white text-sm font-black text-[#6f5736] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff7e8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy size={16} />
                    שכפול תפריט
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    disabled={!selectedTemplate}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e2cfac] bg-white text-sm font-black text-[#6f5736] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff7e8] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    מחיקת תפריט
                  </button>
                </div>
              </Panel>

              <Panel title="שימוש באירועים" icon={<CheckCircle2 size={18} />}>
                <div className="rounded-2xl border border-[#ead7ad] bg-[linear-gradient(135deg,#fff9ee,#f8ead0)] p-4">
                  <div className="text-sm font-black text-[#2d2419]">
                    התפריט הזה הוא תפריט בסיס של האולם
                  </div>
                  <p className="mt-2 text-xs font-bold leading-6 text-[#7c694f]">
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
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-[#d4ab5b] bg-[#fff7e8] p-5 text-center transition hover:-translate-y-0.5 hover:bg-[#fff0d3]">
                  <Upload size={26} className="text-[#a66b18]" />
                  <div className="mt-2 text-sm font-black text-[#2d2419]">
                    העלאת PDF / תמונה
                  </div>
                  <div className="mt-1 text-xs font-bold leading-5 text-[#7c694f]">
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
                  <div className="mt-3 rounded-2xl border border-[#d7b06a] bg-[#fff3d8] px-3 py-2 text-xs font-black text-[#8c5f19]">
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
              <span className="mb-1 block text-xs font-black text-[#8d7654]">
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
                className="h-12 w-full rounded-2xl border border-[#e2cfac] bg-white px-3 text-sm font-bold text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
              >
                <option value="draft">טיוטה</option>
                <option value="active">פעיל</option>
              </select>
            </label>

            <div className="rounded-2xl border border-[#ead7ad] bg-[#fff9ee] p-3 text-xs font-bold leading-6 text-[#806945]">
              התפריט ייפתח אוטומטית עם הקטגוריות: ראשונות, עיקריות וסלטים.
            </div>

            <button
              type="button"
              onClick={createMenu}
              disabled={saving}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-sm font-black text-white shadow-[0_10px_22px_rgba(156,101,23,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
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
              label="כמה מנות לבחור"
              type="number"
              value={newCategoryForm.maxChoices}
              onChange={(value) =>
                setNewCategoryForm((prev) => ({
                  ...prev,
                  minChoices: value,
                  maxChoices: value,
                }))
              }
            />

            <div className="rounded-2xl border border-[#ead7ad] bg-[#fff9ee] p-3 text-xs font-bold leading-6 text-[#806945]">
              לדוגמה: אם רשמת 3, הלקוח יצטרך לבחור 3 מנות מתוך כל המנות שיהיו בקטגוריה.
            </div>

            <button
              type="button"
              onClick={addCategory}
              disabled={saving}
              className="mt-2 h-12 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-sm font-black text-white shadow-[0_10px_22px_rgba(156,101,23,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              הוספת קטגוריה
            </button>
          </div>
        </Modal>
      )}

      {newDishOpen && (
        <Modal title="הוספת מנה לספרייה" onClose={() => setNewDishOpen(false)}>
          <div className="grid gap-4">
            <FormInput
              label="שם מנה"
              value={newDishForm.name}
              onChange={(value) =>
                setNewDishForm((prev) => ({ ...prev, name: value }))
              }
            />

            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8d7654]">
                תיאור
              </span>
              <textarea
                value={newDishForm.description}
                onChange={(event) =>
                  setNewDishForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="min-h-[92px] w-full rounded-2xl border border-[#e2cfac] bg-white px-4 py-3 text-sm font-bold leading-7 text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black text-[#8d7654]">
                תמונת מנה
              </span>

              <div className="rounded-[24px] border border-dashed border-[#d4ab5b] bg-[#fff8ec] p-4 text-center transition hover:bg-[#fff0d3]">
                {newDishForm.image ? (
                  <div className="space-y-3">
                    <img
                      src={newDishForm.image}
                      alt="תמונת מנה"
                      className="mx-auto h-36 w-full max-w-[260px] rounded-[22px] object-cover shadow-sm"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setNewDishForm((prev) => ({ ...prev, image: "" }))
                      }
                      className="text-xs font-black text-rose-700"
                    >
                      הסרת תמונה
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Upload size={28} className="text-[#a66b18]" />

                    <div className="mt-2 text-sm font-black text-[#2d2419]">
                      העלאת תמונה מהמחשב
                    </div>

                    <div className="mt-1 text-xs font-bold text-[#806945]">
                      JPG / PNG / WEBP
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="mt-4 block w-full cursor-pointer rounded-2xl border border-[#e2cfac] bg-white px-3 py-2 text-xs font-bold text-[#6f5736] file:ml-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#d8a241] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                  onChange={(event) =>
                    handleDishImageUpload(event.target.files?.[0])
                  }
                />
              </div>
            </label>

            <div className="rounded-2xl border border-[#ead7ad] bg-[#fff9ee] p-3 text-xs font-bold leading-6 text-[#806945]">
              המנה תישמר בספריית המנות הקבועה של האולם. אם יש קטגוריה פתוחה,
              היא תתווסף גם אליה ותישמר בתפריט.
            </div>

            <button
              type="button"
              onClick={addCustomDish}
              disabled={librarySaving || saving}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-sm font-black text-white shadow-[0_10px_22px_rgba(156,101,23,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {librarySaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              שמירת מנה בספרייה
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
            <div className="rounded-[30px] border border-[#d8b874] bg-[linear-gradient(135deg,#fff9ee,#f7e6bf)] p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-white shadow-lg">
                <Utensils size={24} />
              </div>

              <h2 className="text-2xl font-black text-[#2d2419]">
                {selectedTemplate.name}
              </h2>

              <p className="mt-2 text-sm font-bold leading-7 text-[#7c694f]">
                {selectedTemplate.description || "אין תיאור לתפריט"}
              </p>
            </div>

            {selectedTemplate.categories.length ? (
              selectedTemplate.categories.map((category) => (
                <section
                  key={category.id}
                  className="rounded-[30px] border border-[#ead7ad] bg-[#fffdf9] p-4 shadow-sm"
                >
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#2d2419]">
                        {category.title}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-[#806945]">
                        {category.subtitle}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-[#d7b06a] bg-[#fff3d8] px-3 py-1 text-xs font-black text-[#8c5f19]">
                      לבחור {category.maxChoices} מתוך {category.dishes.length} מנות
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {category.dishes.length ? (
                      category.dishes.map((dish) => (
                        <div
                          key={dish.id}
                          className="flex items-center gap-3 rounded-2xl border border-[#ead7ad] bg-white p-3 shadow-sm"
                        >
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="h-14 w-14 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0cd] text-[#a66b18]">
                              <Utensils size={20} />
                            </div>
                          )}

                          <div>
                            <div className="text-sm font-black text-[#2d2419]">
                              {dish.name}
                            </div>
                            <div className="mt-1 text-xs font-bold leading-5 text-[#806945]">
                              {dish.description || "אין תיאור מנה"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d7b06a] bg-[#fff8ec] p-4 text-center text-sm font-bold text-[#806945]">
                        אין מנות בקטגוריה הזאת
                      </div>
                    )}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d7b06a] bg-[#fff8ec] p-4 text-center text-sm font-bold text-[#806945]">
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
    <div className="group overflow-hidden rounded-[30px] border border-[#e3d1ae] bg-[#fffdf8] p-5 shadow-[0_12px_34px_rgba(43,31,16,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(43,31,16,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-black text-[#8d7654]">{title}</div>
          <div className="mt-2 text-4xl font-black leading-none text-[#2d2419]">
            {value}
          </div>
          <div className="mt-2 text-xs font-bold leading-5 text-[#9a7040]">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#f1e3c8]">
        <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#d8a241,#b67b1d)]" />
      </div>
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
    <section className="rounded-[32px] border border-[#e3d1ae] bg-[#fbf7ef]/96 p-4 shadow-[0_12px_34px_rgba(43,31,16,0.07)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ead7ad] bg-[linear-gradient(145deg,#fff3d7,#d8a241)] text-[#4a3217] shadow-sm">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2d2419]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DishLibraryItem({
  dish,
  saving,
  onDragStart,
  onAdd,
  onDelete,
}: {
  dish: Dish;
  saving: boolean;
  onDragStart: () => void;
  onAdd: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-2xl border border-[#ead7ad] bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7b06a] hover:shadow-md active:cursor-grabbing"
    >
      <GripVertical size={17} className="text-[#b68a40]" />

      {dish.image ? (
        <img
          src={dish.image}
          alt={dish.name}
          className="h-12 w-12 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff0cd] text-[#a66b18]">
          <Utensils size={18} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-[#2d2419]">
          {dish.name}
        </div>
        <div className="truncate text-xs font-bold text-[#806945]">
          {dish.description || "ללא תיאור"}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAdd}
          disabled={saving}
          className="rounded-xl bg-[#fff0cd] px-2 py-1 text-xs font-black text-[#8c5f19] transition hover:bg-[#ffe3aa] disabled:cursor-not-allowed disabled:opacity-50"
        >
          הוספה
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
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
    <article className="overflow-hidden rounded-[26px] border border-[#ead7ad] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#d7b06a] hover:shadow-[0_14px_36px_rgba(43,31,16,0.10)]">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#fff2d5,#d9a94b)] text-xs font-black text-[#4a3217]">
          {index}
        </div>

        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0cd] text-[#a66b18]">
            <Utensils size={22} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-black text-[#2d2419]">
            {dish.name}
          </div>
          <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#806945]">
            {dish.description || "אין תיאור מנה"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#ead7ad] bg-white text-sm font-black text-rose-700 transition hover:bg-rose-50"
      >
        <Trash2 size={16} />
        הסרה מהתפריט
      </button>
    </article>
  );
}

function ChoiceNumberInput({
  label,
  helper,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
}) {
  return (
    <label className="block rounded-2xl border border-[#e2cfac] bg-[#fffdf9] p-3">
      <span className="block text-xs font-black text-[#8d7654]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        onBlur={onBlur}
        className="mt-1 h-9 w-full rounded-xl border border-[#ead7ad] bg-white px-3 text-center text-sm font-black text-[#2d2419] outline-none transition focus:border-[#b98121]"
      />
      <span className="mt-1 block text-[11px] font-bold leading-4 text-[#9a7040]">
        {helper}
      </span>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ead7ad] bg-white px-3 py-2 shadow-sm">
      <span className="text-xs font-black text-[#806945]">{label}</span>
      <span className="text-sm font-black text-[#2d2419]">{value}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e5cfaa] bg-white px-3 py-2 shadow-sm">
      <div className="text-[11px] font-black text-[#806945]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2d2419]">{value}</div>
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
      <span className="mb-1 block text-xs font-black text-[#8d7654]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#e2cfac] bg-white px-3 text-sm font-bold text-[#2d2419] outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d5a046]/10"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#120c06]/28 p-4 backdrop-blur-[4px]">
      <div
        className={[
          "max-h-[92vh] w-full overflow-y-auto rounded-[34px] border border-[#e2cfac] bg-[#fbf7ef] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)]",
          wide ? "max-w-6xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#2d2419]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2cfac] bg-white text-[#6f5736] transition hover:bg-[#fff7e8]"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
