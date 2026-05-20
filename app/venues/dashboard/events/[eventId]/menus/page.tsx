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
  Link2,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
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

type CoupleSelection = {
  categoryId: string;
  dishIds: string[];
};

type EventMenuStatus = "draft" | "sent" | "selected" | "approved";

const dishLibrary: Dish[] = [
  {
    id: "dish-1",
    name: "סלמון טריאקי",
    description: "פילה סלמון ברוטב טריאקי עדין, שומשום ובצל ירוק.",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=260&q=80",
    tags: ["דג", "ללא גלוטן"],
  },
  {
    id: "dish-2",
    name: "פילה בקר",
    description: "פילה בקר ברוטב יין אדום, לצד ירקות שורש.",
    image:
      "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=260&q=80",
    tags: ["בשרי"],
  },
  {
    id: "dish-3",
    name: "סלט קיסר",
    description: "חסה פריכה, קרוטונים, פרמזן ורוטב קיסר.",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=260&q=80",
    tags: ["צמחוני"],
  },
  {
    id: "dish-4",
    name: "פסטה רוזה",
    description: "פסטה טרייה ברוטב עגבניות ושמנת.",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=260&q=80",
    tags: ["צמחוני"],
  },
  {
    id: "dish-5",
    name: "קבבוני טלה",
    description: "קבבוני טלה על הגריל עם טחינה ירוקה.",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=260&q=80",
    tags: ["בשרי"],
  },
  {
    id: "dish-6",
    name: "קרפצ׳יו סלק",
    description: "סלק צלוי, גבינת עיזים, אגוזים ורוטב בלסמי.",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=260&q=80",
    tags: ["צמחוני"],
  },
  {
    id: "dish-7",
    name: "מיני פבלובה",
    description: "מרנג אישי עם קרם וניל ופירות יער.",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=260&q=80",
    tags: ["קינוח"],
  },
  {
    id: "dish-8",
    name: "מוס שוקולד",
    description: "מוס שוקולד עשיר בכוס אישית.",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=260&q=80",
    tags: ["קינוח"],
  },
];

const initialCategories: MenuCategory[] = [
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
    title: "בופה וקבלת פנים",
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

function getEventName(eventId: string) {
  if (eventId === "evt-1004") return "חתונה - משפחת אברהם";
  return "חתונה - משפחת לוי";
}

function publicChooseLink(eventId: string) {
  return `https://www.invistimo.com/menus/${eventId}/choose`;
}

function statusLabel(status: EventMenuStatus) {
  if (status === "approved") return "מאושר";
  if (status === "selected") return "הזוג בחר";
  if (status === "sent") return "נשלח לזוג";
  return "טיוטה";
}

function statusClass(status: EventMenuStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "selected") return "bg-violet-50 text-violet-700";
  if (status === "sent") return "bg-sky-50 text-sky-700";
  return "bg-amber-50 text-amber-700";
}

export default function EventMenusPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "evt-1001";
  const eventName = getEventName(eventId);

  const [menuName, setMenuName] = useState("תפריט פרימיום - עותק לאירוע");
  const [sourceMenuName] = useState("תפריט פרימיום");
  const [status, setStatus] = useState<EventMenuStatus>("draft");
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategories[0].id);
  const [draggedDish, setDraggedDish] = useState<Dish | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [saving, setSaving] = useState(false);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addDishOpen, setAddDishOpen] = useState(false);
  const [sendLinkOpen, setSendLinkOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coupleSummaryOpen, setCoupleSummaryOpen] = useState(false);

  const [coupleSelections, setCoupleSelections] = useState<CoupleSelection[]>([
    { categoryId: "cat-starters", dishIds: ["dish-3", "dish-6"] },
    { categoryId: "cat-main", dishIds: ["dish-2", "dish-1"] },
  ]);

  const publicLink = publicChooseLink(eventId);

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) || categories[0];

  const stats = useMemo(() => {
    const dishCount = categories.reduce((sum, category) => sum + category.dishes.length, 0);
    const selectedCount = coupleSelections.reduce(
      (sum, selection) => sum + selection.dishIds.length,
      0
    );
    const completedCategories = categories.filter((category) => {
      const selection = coupleSelections.find((item) => item.categoryId === category.id);
      const count = selection?.dishIds.length || 0;
      return count >= category.minChoices && count <= category.maxChoices;
    }).length;

    return {
      categories: categories.length,
      dishCount,
      selectedCount,
      completedCategories,
    };
  }, [categories, coupleSelections]);

  const saveMenu = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 700);
  };

  const addCategory = () => {
    const id = `cat-${Date.now()}`;

    setCategories((current) => [
      ...current,
      {
        id,
        title: "קטגוריה חדשה",
        subtitle: "הגדרת בחירה ומנות",
        minChoices: 1,
        maxChoices: 3,
        dishes: [],
      },
    ]);

    setSelectedCategoryId(id);
    setAddCategoryOpen(false);
  };

  const removeCategory = (categoryId: string) => {
    const nextCategories = categories.filter((category) => category.id !== categoryId);

    setCategories(nextCategories);
    setCoupleSelections((current) =>
      current.filter((selection) => selection.categoryId !== categoryId)
    );

    if (selectedCategoryId === categoryId && nextCategories.length > 0) {
      setSelectedCategoryId(nextCategories[0].id);
    }
  };

  const updateCategory = (categoryId: string, patch: Partial<MenuCategory>) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, ...patch } : category
      )
    );
  };

  const addDishToCategory = (categoryId: string, dish: Dish) => {
    setCategories((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;
        if (category.dishes.some((item) => item.id === dish.id)) return category;
        return { ...category, dishes: [...category.dishes, dish] };
      })
    );
  };

  const removeDishFromCategory = (categoryId: string, dishId: string) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? { ...category, dishes: category.dishes.filter((dish) => dish.id !== dishId) }
          : category
      )
    );

    setCoupleSelections((current) =>
      current.map((selection) =>
        selection.categoryId === categoryId
          ? { ...selection, dishIds: selection.dishIds.filter((id) => id !== dishId) }
          : selection
      )
    );
  };

  const toggleCoupleChoice = (category: MenuCategory, dishId: string) => {
    setCoupleSelections((current) => {
      const existing = current.find((selection) => selection.categoryId === category.id);
      const currentDishIds = existing?.dishIds || [];
      const exists = currentDishIds.includes(dishId);

      let nextDishIds = exists
        ? currentDishIds.filter((id) => id !== dishId)
        : [...currentDishIds, dishId];

      if (!exists && nextDishIds.length > category.maxChoices) {
        nextDishIds = nextDishIds.slice(1);
      }

      const nextSelection = { categoryId: category.id, dishIds: nextDishIds };

      if (!existing) return [...current, nextSelection];

      return current.map((selection) =>
        selection.categoryId === category.id ? nextSelection : selection
      );
    });

    setStatus("selected");
  };

  const selectedCountForCategory = (categoryId: string) => {
    return (
      coupleSelections.find((selection) => selection.categoryId === categoryId)?.dishIds.length || 0
    );
  };

  const selectedDishesForCategory = (category: MenuCategory) => {
    const ids =
      coupleSelections.find((selection) => selection.categoryId === category.id)?.dishIds || [];

    return category.dishes.filter((dish) => ids.includes(dish.id));
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

    addDishToCategory(selectedCategory.id, newDish);
    setAddDishOpen(false);
  };

  const markSent = () => {
    setStatus("sent");
    setSendLinkOpen(false);
  };

  const approveMenu = () => {
    setStatus("approved");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>אירועים</span>
                <span>›</span>
                <span>{eventName}</span>
                <span>›</span>
                <span>תפריט האירוע</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                  <Utensils size={32} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                      תפריט האירוע
                    </h1>

                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                    זהו עותק של תפריט האולם לאירוע הזה בלבד. אפשר לערוך אותו,
                    לשלוח לזוג קישור בחירת מנות, ולאשר את הבחירה הסופית.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/venues/dashboard/events/${eventId}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <ArrowRight size={17} />
                חזרה לאירוע
              </Link>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <Eye size={17} />
                תצוגת זוג
              </button>

              <button
                type="button"
                onClick={() => setSendLinkOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9]"
              >
                <Send size={17} />
                שליחת קישור לזוג
              </button>

              <button
                type="button"
                onClick={saveMenu}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                שמירת תפריט
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="קטגוריות" value={`${stats.categories}`} subtitle="ראשונות / עיקריות / בופה..." />
          <MetricCard title="מנות בתפריט" value={`${stats.dishCount}`} subtitle="מנות זמינות לזוג" />
          <MetricCard title="בחירות זוג" value={`${stats.selectedCount}`} subtitle="מנות שסומנו בקישור" />
          <MetricCard
            title="קטגוריות תקינות"
            value={`${stats.completedCategories}/${stats.categories}`}
            subtitle="לפי מינימום ומקסימום בחירה"
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[300px_1fr_350px]">
          <aside className="space-y-5">
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
                    onAdd={() => addDishToCategory(selectedCategory.id, dish)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setAddDishOpen(true)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
              >
                <Plus size={16} />
                הוספת מנה חדשה
              </button>
            </Panel>

            <Panel title="העלאת תפריט / קובץ" icon={<Upload size={18} />}>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5 text-center transition hover:bg-[#f4ead9]">
                <Upload size={24} className="text-[#b98121]" />
                <div className="mt-2 text-sm font-black text-[#2b241c]">
                  העלאת PDF / תמונה
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
                  קובץ פנימי לאירוע הספציפי.
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

          <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_240px]">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-[#8a7b68]">שם תפריט האירוע</span>
                <input
                  value={menuName}
                  onChange={(event) => setMenuName(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                />
              </label>

              <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 py-3">
                <div className="text-xs font-black text-[#8a7b68]">מקור התפריט</div>
                <div className="mt-1 text-sm font-black text-[#2b241c]">{sourceMenuName}</div>
              </div>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
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
                    {selectedCountForCategory(category.id)}/{category.maxChoices}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setAddCategoryOpen(true)}
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
                  if (draggedDish) addDishToCategory(selectedCategory.id, draggedDish);
                  setDraggedDish(null);
                }}
                className="rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4"
              >
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                      onClick={() => removeCategory(selectedCategory.id)}
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
                  {selectedCategory.dishes.map((dish, index) => {
                    const selectedByCouple =
                      coupleSelections
                        .find((selection) => selection.categoryId === selectedCategory.id)
                        ?.dishIds.includes(dish.id) || false;

                    return (
                      <MenuDishCard
                        key={dish.id}
                        dish={dish}
                        index={index + 1}
                        selectedByCouple={selectedByCouple}
                        onRemove={() => removeDishFromCategory(selectedCategory.id, dish.id)}
                        onToggle={() => toggleCoupleChoice(selectedCategory, dish.id)}
                      />
                    );
                  })}

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
            ) : null}
          </section>

          <aside className="space-y-5">
            <Panel title="סטטוס וקישור לזוג" icon={<Link2 size={18} />}>
              <div className="space-y-3">
                <InfoLine label="אירוע" value={eventName} />
                <InfoLine label="תפריט" value={menuName} />
                <InfoLine label="סטטוס" value={statusLabel(status)} />
                <InfoLine label="בחירות" value={`${stats.selectedCount} מנות סומנו`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                <div className="mb-2 text-xs font-black text-[#8a7b68]">
                  קישור בחירת מנות לזוג
                </div>
                <div className="break-all text-xs font-bold leading-5 text-[#2b241c]">
                  {publicLink}
                </div>

                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(publicLink)}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
                >
                  <Copy size={15} />
                  העתקת קישור
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSendLinkOpen(true)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
              >
                <Send size={16} />
                שליחת קישור לזוג
              </button>
            </Panel>

            <Panel title="סיכום בחירות זוג" icon={<CheckCircle2 size={18} />}>
              <div className="space-y-3">
                {categories.map((category) => {
                  const count = selectedCountForCategory(category.id);
                  const valid = count >= category.minChoices && count <= category.maxChoices;

                  return (
                    <div key={category.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-[#2b241c]">{category.title}</div>
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-black",
                            valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {count}/{category.maxChoices}
                        </span>
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                        נדרש לבחור לפחות {category.minChoices} ועד {category.maxChoices}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCoupleSummaryOpen(true)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
              >
                <Eye size={16} />
                צפייה בבחירות
              </button>
            </Panel>

            <Panel title="פעולות מהירות" icon={<Sparkles size={18} />}>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={approveMenu}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white"
                >
                  <CheckCircle2 size={16} />
                  אישור תפריט סופי
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Eye size={16} />
                  תצוגת זוג
                </button>

                <button
                  type="button"
                  onClick={saveMenu}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Save size={16} />
                  שמירה
                </button>
              </div>
            </Panel>
          </aside>
        </section>
      </div>

      {addCategoryOpen && (
        <Modal title="הוספת קטגוריה" onClose={() => setAddCategoryOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="שם קטגוריה" value="סלטים / עמדות / קינוחים" />
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

      {addDishOpen && (
        <Modal title="הוספת מנה חדשה" onClose={() => setAddDishOpen(false)}>
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

      {sendLinkOpen && (
        <Modal title="שליחת קישור בחירת מנות לזוג" onClose={() => setSendLinkOpen(false)}>
          <div className="space-y-3">
            <InfoLine label="קישור" value={publicLink} />
            <InputLike label="טלפון לשליחה" value="050-1234567" />

            <textarea
              defaultValue={`שלום, מצורף קישור לבחירת מנות עבור האירוע שלכם: ${publicLink}`}
              className="min-h-[110px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />

            <button
              type="button"
              onClick={markSent}
              className="h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              סמן כקישור שנשלח
            </button>
          </div>
        </Modal>
      )}

      {previewOpen && (
        <Modal title="תצוגת זוג - בחירת מנות" onClose={() => setPreviewOpen(false)} wide>
          <CouplePreview
            categories={categories}
            selections={coupleSelections}
            onToggle={toggleCoupleChoice}
          />
        </Modal>
      )}

      {coupleSummaryOpen && (
        <Modal title="בחירות הזוג" onClose={() => setCoupleSummaryOpen(false)}>
          <div className="space-y-3">
            {categories.map((category) => {
              const selected = selectedDishesForCategory(category);

              return (
                <div key={category.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                  <div className="text-sm font-black text-[#2b241c]">{category.title}</div>
                  <div className="mt-2 text-xs font-bold leading-6 text-[#7f705d]">
                    {selected.length > 0
                      ? selected.map((dish) => dish.name).join(" · ")
                      : "לא נבחרו מנות"}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={approveMenu}
              className="mt-2 h-11 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white"
            >
              אישור הבחירות כתפריט סופי
            </button>
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
  selectedByCouple,
  onRemove,
  onToggle,
}: {
  dish: Dish;
  index: number;
  selectedByCouple: boolean;
  onRemove: () => void;
  onToggle: () => void;
}) {
  return (
    <article
      className={[
        "overflow-hidden rounded-[24px] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md",
        selectedByCouple ? "border-emerald-300 ring-2 ring-emerald-100" : "border-[#eadfce]",
      ].join(" ")}
    >
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
          <span
            key={tag}
            className="rounded-full bg-[#fff8eb] px-2.5 py-1 text-[11px] font-black text-[#9f6f1a]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 border-t border-[#eadfce]">
        <button
          type="button"
          onClick={onToggle}
          className={[
            "flex h-11 items-center justify-center gap-2 text-sm font-black",
            selectedByCouple ? "bg-emerald-50 text-emerald-700" : "bg-[#fffdf8] text-[#6f6252]",
          ].join(" ")}
        >
          <CheckCircle2 size={16} />
          {selectedByCouple ? "נבחר על ידי הזוג" : "סמן כבחירת זוג"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="flex h-11 items-center justify-center gap-2 border-r border-[#eadfce] bg-white text-sm font-black text-rose-700"
        >
          <Trash2 size={16} />
          הסרה
        </button>
      </div>
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

function CouplePreview({
  categories,
  selections,
  onToggle,
}: {
  categories: MenuCategory[];
  selections: CoupleSelection[];
  onToggle: (category: MenuCategory, dishId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-[#eadfce] bg-[#fff8eb] p-4 text-center">
        <h2 className="text-2xl font-black text-[#2b241c]">בחירת מנות לאירוע</h2>
        <p className="mt-1 text-sm font-bold text-[#7f705d]">
          כך הזוג יראה את הקישור הציבורי. הבחירה מתעדכנת בתפריט האירוע.
        </p>
      </div>

      {categories.map((category) => {
        const selectedDishIds =
          selections.find((selection) => selection.categoryId === category.id)?.dishIds || [];

        return (
          <section key={category.id} className="rounded-[26px] border border-[#eadfce] bg-white p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-black text-[#2b241c]">{category.title}</h3>
                <p className="mt-1 text-sm font-bold text-[#8a7b68]">{category.subtitle}</p>
              </div>

              <span className="w-fit rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
                נבחרו {selectedDishIds.length} מתוך {category.maxChoices}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {category.dishes.map((dish) => {
                const selected = selectedDishIds.includes(dish.id);

                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => onToggle(category, dish.id)}
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-3 text-right transition",
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-[#eadfce] bg-[#fffdf8] hover:bg-[#fbf5ea]",
                    ].join(" ")}
                  >
                    <img src={dish.image} alt={dish.name} className="h-14 w-14 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-[#2b241c]">{dish.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#8a7b68]">
                        {dish.description}
                      </div>
                    </div>

                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full border",
                        selected
                          ? "border-emerald-300 bg-white text-emerald-700"
                          : "border-[#eadfce] bg-white text-transparent",
                      ].join(" ")}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
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
