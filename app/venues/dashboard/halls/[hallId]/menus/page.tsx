"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Edit3,
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
  name: string;
  description: string;
  type: string;
  status: "active" | "draft";
  categories: MenuCategory[];
  updatedAt: string;
};

const dishLibrary: Dish[] = [
  {
    id: "dish-1",
    name: "סלמון טריאקי",
    description: "פילה סלמון ברוטב טריאקי עדין, שומשום ובצל ירוק.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=260&q=80",
    tags: ["דג", "ללא גלוטן"],
  },
  {
    id: "dish-2",
    name: "פילה בקר",
    description: "פילה בקר ברוטב יין אדום, לצד ירקות שורש.",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=260&q=80",
    tags: ["בשרי"],
  },
  {
    id: "dish-3",
    name: "סלט קיסר",
    description: "חסה פריכה, קרוטונים, פרמזן ורוטב קיסר.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=260&q=80",
    tags: ["צמחוני"],
  },
  {
    id: "dish-4",
    name: "פסטה רוזה",
    description: "פסטה טרייה ברוטב עגבניות ושמנת.",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=260&q=80",
    tags: ["צמחוני"],
  },
  {
    id: "dish-5",
    name: "קבבוני טלה",
    description: "קבבוני טלה על הגריל עם טחינה ירוקה.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=260&q=80",
    tags: ["בשרי"],
  },
  {
    id: "dish-6",
    name: "קרפצ׳יו סלק",
    description: "סלק צלוי, גבינת עיזים, אגוזים ורוטב בלסמי.",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=260&q=80",
    tags: ["צמחוני"],
  },
  {
    id: "dish-7",
    name: "מיני פבלובה",
    description: "מרנג אישי עם קרם וניל ופירות יער.",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=260&q=80",
    tags: ["קינוח"],
  },
  {
    id: "dish-8",
    name: "מוס שוקולד",
    description: "מוס שוקולד עשיר בכוס אישית.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=260&q=80",
    tags: ["קינוח"],
  },
];

function createDefaultCategories(): MenuCategory[] {
  return [
    {
      id: "cat-starters",
      title: "ראשונות",
      subtitle: "מנות פתיחה לשולחן / להגשה",
      minChoices: 2,
      maxChoices: 5,
      dishes: [dishLibrary[2], dishLibrary[5], dishLibrary[0]],
    },
    {
      id: "cat-main",
      title: "עיקריות",
      subtitle: "מנות עיקריות לבחירת הזוג",
      minChoices: 2,
      maxChoices: 4,
      dishes: [dishLibrary[1], dishLibrary[0], dishLibrary[4], dishLibrary[3]],
    },
    {
      id: "cat-buffet",
      title: "בופה",
      subtitle: "עמדות פתיחה / קבלת פנים",
      minChoices: 3,
      maxChoices: 6,
      dishes: [dishLibrary[3], dishLibrary[4], dishLibrary[5]],
    },
    {
      id: "cat-desserts",
      title: "קינוחים",
      subtitle: "קינוחים אישיים ובר קינוחים",
      minChoices: 2,
      maxChoices: 4,
      dishes: [dishLibrary[6], dishLibrary[7]],
    },
  ];
}

const initialTemplates: HallMenuTemplate[] = [
  {
    id: "menu-premium",
    name: "תפריט פרימיום",
    description: "תפריט חתונות יוקרתי עם ראשונות, עיקריות, בופה וקינוחים.",
    type: "חתונות",
    status: "active",
    categories: createDefaultCategories(),
    updatedAt: "עודכן היום",
  },
  {
    id: "menu-classic",
    name: "תפריט קלאסי",
    description: "תפריט בסיס עשיר לאירועים כלליים.",
    type: "אירועים כלליים",
    status: "active",
    categories: [
      {
        id: "classic-starters",
        title: "ראשונות",
        subtitle: "מנות פתיחה",
        minChoices: 2,
        maxChoices: 4,
        dishes: [dishLibrary[2], dishLibrary[5]],
      },
      {
        id: "classic-main",
        title: "עיקריות",
        subtitle: "מנות עיקריות",
        minChoices: 2,
        maxChoices: 3,
        dishes: [dishLibrary[1], dishLibrary[3], dishLibrary[4]],
      },
      {
        id: "classic-desserts",
        title: "קינוחים",
        subtitle: "קינוחים לבחירה",
        minChoices: 1,
        maxChoices: 3,
        dishes: [dishLibrary[6], dishLibrary[7]],
      },
    ],
    updatedAt: "עודכן אתמול",
  },
  {
    id: "menu-vip",
    name: "תפריט VIP",
    description: "תפריט מורחב עם עמדות מיוחדות ובר שף.",
    type: "אירועי יוקרה",
    status: "draft",
    categories: createDefaultCategories(),
    updatedAt: "טיוטה",
  },
];

function getHallName(hallId: string) {
  if (hallId === "garden-hall") return "גן אירועים";
  if (hallId === "sky-hall") return "SKY Hall";
  return "אולם הזהב";
}

export default function HallMenusPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "main-gold-hall";
  const hallName = getHallName(hallId);

  const [templates, setTemplates] = useState<HallMenuTemplate[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplates[0].id);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialTemplates[0].categories[0].id);
  const [draggedDish, setDraggedDish] = useState<Dish | null>(null);
  const [saving, setSaving] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newDishOpen, setNewDishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) || templates[0];

  const selectedCategory =
    selectedTemplate.categories.find((category) => category.id === selectedCategoryId) ||
    selectedTemplate.categories[0];

  const stats = useMemo(() => {
    const categoriesCount = selectedTemplate.categories.length;
    const dishesCount = selectedTemplate.categories.reduce(
      (sum, category) => sum + category.dishes.length,
      0
    );

    return {
      templates: templates.length,
      activeTemplates: templates.filter((template) => template.status === "active").length,
      categoriesCount,
      dishesCount,
    };
  }, [selectedTemplate, templates]);

  const saveMock = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 650);
  };

  const updateTemplate = (templateId: string, patch: Partial<HallMenuTemplate>) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId ? { ...template, ...patch, updatedAt: "עודכן עכשיו" } : template
      )
    );
  };

  const updateCategory = (categoryId: string, patch: Partial<MenuCategory>) => {
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

  const addMenu = () => {
    const id = `menu-${Date.now()}`;
    const categoryId = `cat-${Date.now()}`;

    setTemplates((current) => [
      ...current,
      {
        id,
        name: "תפריט חדש",
        description: "תיאור קצר של התפריט",
        type: "חתונות",
        status: "draft",
        updatedAt: "נוצר עכשיו",
        categories: [
          {
            id: categoryId,
            title: "ראשונות",
            subtitle: "מנות פתיחה",
            minChoices: 1,
            maxChoices: 3,
            dishes: [],
          },
        ],
      },
    ]);

    setSelectedTemplateId(id);
    setSelectedCategoryId(categoryId);
    setNewMenuOpen(false);
  };

  const duplicateMenu = (template: HallMenuTemplate) => {
    const id = `menu-copy-${Date.now()}`;

    setTemplates((current) => [
      ...current,
      {
        ...template,
        id,
        name: `${template.name} - עותק`,
        status: "draft",
        updatedAt: "שוכפל עכשיו",
        categories: template.categories.map((category) => ({
          ...category,
          id: `${category.id}-${Date.now()}`,
          dishes: [...category.dishes],
        })),
      },
    ]);

    setSelectedTemplateId(id);
  };

  const deleteMenu = (templateId: string) => {
    setTemplates((current) => current.filter((template) => template.id !== templateId));

    if (selectedTemplateId === templateId) {
      const next = templates.find((template) => template.id !== templateId);
      if (next) {
        setSelectedTemplateId(next.id);
        setSelectedCategoryId(next.categories[0]?.id || "");
      }
    }
  };

  const addCategory = () => {
    const id = `cat-${Date.now()}`;

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              updatedAt: "עודכן עכשיו",
              categories: [
                ...template.categories,
                {
                  id,
                  title: "קטגוריה חדשה",
                  subtitle: "הגדרת בחירה ומנות",
                  minChoices: 1,
                  maxChoices: 3,
                  dishes: [],
                },
              ],
            }
          : template
      )
    );

    setSelectedCategoryId(id);
    setNewCategoryOpen(false);
  };

  const deleteCategory = (categoryId: string) => {
    const nextCategories = selectedTemplate.categories.filter(
      (category) => category.id !== categoryId
    );

    updateTemplate(selectedTemplate.id, { categories: nextCategories });

    if (selectedCategoryId === categoryId && nextCategories.length > 0) {
      setSelectedCategoryId(nextCategories[0].id);
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
    const newDish: Dish = {
      id: `dish-${Date.now()}`,
      name: "מנה חדשה",
      description: "תיאור קצר של המנה החדשה",
      image:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=260&q=80",
      tags: ["חדש"],
    };

    addDishToCategory(newDish);
    setNewDishOpen(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>ניהול אולם</span>
                <span>›</span>
                <span>{hallName}</span>
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
                    כאן האולם בונה תפריטי בסיס קבועים. אחר כך מתוך אירוע מסוים בוחרים
                    תפריט, נוצר עותק לאירוע, והזוג מקבל קישור לבחירת מנות.
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
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
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
                onClick={saveMock}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                שמירת תפריט
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="תפריטים באולם" value={`${stats.templates}`} subtitle="תפריטי בסיס קבועים" />
          <MetricCard title="תפריטים פעילים" value={`${stats.activeTemplates}`} subtitle="זמינים לבחירה באירוע" />
          <MetricCard title="קטגוריות בתפריט" value={`${stats.categoriesCount}`} subtitle="ראשונות / עיקריות / בופה..." />
          <MetricCard title="מנות בתפריט" value={`${stats.dishesCount}`} subtitle="סה״כ מנות בתפריט הנבחר" />
        </section>

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
                          {template.type} · {template.updatedAt}
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
                      <InfoPill label="קטגוריות" value={`${template.categories.length}`} />
                      <InfoPill
                        label="מנות"
                        value={`${template.categories.reduce((sum, category) => sum + category.dishes.length, 0)}`}
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

            <Panel title="ספריית מנות" icon={<BookOpen size={18} />}>
              <div className="mb-3 flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3">
                <Search size={16} className="text-[#a2937f]" />
                <input
                  placeholder="חיפוש מנה..."
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#b7a895]"
                />
              </div>

              <div className="space-y-2">
                {dishLibrary.map((dish) => (
                  <DishLibraryItem
                    key={dish.id}
                    dish={dish}
                    onDragStart={() => setDraggedDish(dish)}
                    onAdd={() => addDishToCategory(dish)}
                  />
                ))}
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

          <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_220px_160px]">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-[#8a7b68]">שם התפריט</span>
                <input
                  value={selectedTemplate.name}
                  onChange={(event) => updateTemplate(selectedTemplate.id, { name: event.target.value })}
                  className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-[#8a7b68]">סוג תפריט</span>
                <input
                  value={selectedTemplate.type}
                  onChange={(event) => updateTemplate(selectedTemplate.id, { type: event.target.value })}
                  className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  updateTemplate(selectedTemplate.id, {
                    status: selectedTemplate.status === "active" ? "draft" : "active",
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
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">תיאור התפריט</span>
              <textarea
                value={selectedTemplate.description}
                onChange={(event) =>
                  updateTemplate(selectedTemplate.id, { description: event.target.value })
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
                          updateCategory(selectedCategory.id, { title: event.target.value })
                        }
                        className="h-10 rounded-2xl border border-[#eadfce] bg-white px-3 text-xl font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                      />

                      <span className="rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
                        בחירה של {selectedCategory.minChoices} מתוך {selectedCategory.maxChoices}
                      </span>
                    </div>

                    <input
                      value={selectedCategory.subtitle}
                      onChange={(event) =>
                        updateCategory(selectedCategory.id, { subtitle: event.target.value })
                      }
                      className="mt-2 h-9 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#8a7b68] outline-none focus:border-[#b98121]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SmallNumberInput
                      label="מינימום"
                      value={selectedCategory.minChoices}
                      onChange={(value) => updateCategory(selectedCategory.id, { minChoices: value })}
                    />

                    <SmallNumberInput
                      label="מקסימום"
                      value={selectedCategory.maxChoices}
                      onChange={(value) => updateCategory(selectedCategory.id, { maxChoices: value })}
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
                      <Utensils className="mx-auto text-[#b98121]" size={30} />
                      <div className="mt-3 text-lg font-black text-[#2b241c]">
                        אין עדיין מנות בקטגוריה
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                        גררי מנות מהספרייה או הוסיפי מנה חדשה.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-8 text-center">
                <div className="text-xl font-black text-[#2b241c]">אין קטגוריות בתפריט</div>
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

          <aside className="space-y-5">
            <Panel title="פעולות תפריט" icon={<Sparkles size={18} />}>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={saveMock}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  שמירת תפריט
                </button>

                <button
                  type="button"
                  onClick={() => duplicateMenu(selectedTemplate)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Copy size={16} />
                  שכפול תפריט
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Eye size={16} />
                  תצוגה מקדימה
                </button>

                <button
                  type="button"
                  onClick={() => deleteMenu(selectedTemplate.id)}
                  disabled={templates.length <= 1}
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
                  מתוך עמוד אירוע בוחרים אותו, ואז המערכת יוצרת עותק לאירוע הספציפי.
                  הבחירות של הזוג מתעדכנות רק בעותק של האירוע.
                </p>
              </div>

              <div className="mt-3 space-y-2">
                <InfoLine label="אירועים שמשתמשים בו" value="7" />
                <InfoLine label="עודכן לאחרונה" value={selectedTemplate.updatedAt} />
                <InfoLine label="סטטוס" value={selectedTemplate.status === "active" ? "פעיל" : "טיוטה"} />
              </div>
            </Panel>

            <Panel title="העלאת תפריט קיים" icon={<Upload size={18} />}>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5 text-center transition hover:bg-[#f4ead9]">
                <Upload size={24} className="text-[#b98121]" />
                <div className="mt-2 text-sm font-black text-[#2b241c]">
                  העלאת PDF / תמונה
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
                  אפשר להעלות תפריט קיים ולבנות ממנו קטגוריות.
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
      </div>

      {newMenuOpen && (
        <Modal title="הוספת תפריט חדש" onClose={() => setNewMenuOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="שם תפריט" value="תפריט חדש" />
            <InputLike label="סוג תפריט" value="חתונות / בר מצווה / כנסים" />
            <InputLike label="תיאור קצר" value="תפריט בסיס לבחירה באירועים" />
            <button
              type="button"
              onClick={addMenu}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              יצירת תפריט
            </button>
          </div>
        </Modal>
      )}

      {newCategoryOpen && (
        <Modal title="הוספת קטגוריה" onClose={() => setNewCategoryOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="שם קטגוריה" value="ראשונות / עיקריות / בופה / קינוחים" />
            <InputLike label="תיאור קצר" value="קטגוריה לבחירת הזוג" />
            <InputLike label="כמה מינימום לבחור" value="1" />
            <InputLike label="כמה מקסימום לבחור" value="3" />
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
            <InputLike label="שם מנה" value="מנה חדשה" />
            <InputLike label="תיאור" value="תיאור קצר שיוצג לזוג" />
            <InputLike label="תגיות" value="צמחוני, ללא גלוטן, חריף..." />
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]">
              <Upload size={17} />
              העלאת תמונת מנה
              <input type="file" accept="image/*" className="hidden" />
            </label>
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

      {previewOpen && (
        <Modal title={`תצוגה מקדימה - ${selectedTemplate.name}`} onClose={() => setPreviewOpen(false)} wide>
          <div className="space-y-5">
            <div className="rounded-[26px] border border-[#eadfce] bg-[#fff8eb] p-5 text-center">
              <h2 className="text-2xl font-black text-[#2b241c]">{selectedTemplate.name}</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                {selectedTemplate.description}
              </p>
            </div>

            {selectedTemplate.categories.map((category) => (
              <section key={category.id} className="rounded-[26px] border border-[#eadfce] bg-white p-4">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#2b241c]">{category.title}</h3>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">{category.subtitle}</p>
                  </div>

                  <span className="w-fit rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
                    בחירה של {category.minChoices} מתוך {category.maxChoices}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {category.dishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="flex items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3"
                    >
                      <img src={dish.image} alt={dish.name} className="h-14 w-14 rounded-2xl object-cover" />
                      <div>
                        <div className="text-sm font-black text-[#2b241c]">{dish.name}</div>
                        <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
                          {dish.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
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
      <img src={dish.image} alt={dish.name} className="h-12 w-12 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-[#2b241c]">{dish.name}</div>
        <div className="truncate text-xs font-bold text-[#8a7b68]">{dish.tags.join(" · ")}</div>
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
        <img src={dish.image} alt={dish.name} className="h-16 w-16 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-black text-[#2b241c]">{dish.name}</div>
          <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#8a7b68]">
            {dish.description}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-3 pb-3">
        {dish.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[#fff8eb] px-2.5 py-1 text-[11px] font-black text-[#9f6f1a]">
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

function InputLike({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <input
        defaultValue={value}
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
