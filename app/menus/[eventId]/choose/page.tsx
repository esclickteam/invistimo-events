"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Loader2,
  Save,
  Sparkles,
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

type SelectionMap = Record<string, string[]>;

const eventData = {
  title: "חתונה - משפחת לוי",
  date: "19.05.2026",
  hallName: "אולם הזהב",
  coupleName: "משפחת לוי",
  menuName: "תפריט פרימיום",
};

const menuCategories: MenuCategory[] = [
  {
    id: "cat-starters",
    title: "ראשונות",
    subtitle: "בחרו מנות פתיחה שיוגשו לשולחן או בתחילת האירוע",
    minChoices: 2,
    maxChoices: 5,
    dishes: [
      {
        id: "dish-1",
        name: "סלט קיסר",
        description: "חסה פריכה, קרוטונים, פרמזן ורוטב קיסר עדין.",
        image:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=420&q=80",
        tags: ["צמחוני"],
      },
      {
        id: "dish-2",
        name: "קרפצ׳יו סלק",
        description: "סלק צלוי, גבינת עיזים, אגוזים ורוטב בלסמי.",
        image:
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=420&q=80",
        tags: ["צמחוני"],
      },
      {
        id: "dish-3",
        name: "סלמון טריאקי",
        description: "פילה סלמון ברוטב טריאקי עדין, שומשום ובצל ירוק.",
        image:
          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=420&q=80",
        tags: ["דג", "ללא גלוטן"],
      },
      {
        id: "dish-4",
        name: "קבבוני טלה",
        description: "קבבוני טלה על הגריל עם טחינה ירוקה ועשבי תיבול.",
        image:
          "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=420&q=80",
        tags: ["בשרי"],
      },
      {
        id: "dish-5",
        name: "פסטה רוזה",
        description: "פסטה טרייה ברוטב עגבניות ושמנת.",
        image:
          "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=420&q=80",
        tags: ["צמחוני"],
      },
    ],
  },
  {
    id: "cat-main",
    title: "עיקריות",
    subtitle: "בחרו את המנות המרכזיות שיופיעו בתפריט האירוע",
    minChoices: 2,
    maxChoices: 4,
    dishes: [
      {
        id: "dish-6",
        name: "פילה בקר",
        description: "פילה בקר ברוטב יין אדום לצד ירקות שורש.",
        image:
          "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=420&q=80",
        tags: ["בשרי"],
      },
      {
        id: "dish-7",
        name: "פרגית במרינדה",
        description: "פרגית עסיסית בגריל עם עשבי תיבול ותיבול עדין.",
        image:
          "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=420&q=80",
        tags: ["בשרי"],
      },
      {
        id: "dish-8",
        name: "דג לברק",
        description: "פילה לברק בתנור עם לימון, שמן זית ועשבי תיבול.",
        image:
          "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=420&q=80",
        tags: ["דג"],
      },
      {
        id: "dish-9",
        name: "ריזוטו פטריות",
        description: "ריזוטו קרמי עם פטריות יער ופרמזן.",
        image:
          "https://images.unsplash.com/photo-1633964913295-ceb43826e7c4?auto=format&fit=crop&w=420&q=80",
        tags: ["צמחוני"],
      },
    ],
  },
  {
    id: "cat-buffet",
    title: "בופה וקבלת פנים",
    subtitle: "בחרו עמדות או מנות שיוגשו בקבלת הפנים",
    minChoices: 3,
    maxChoices: 6,
    dishes: [
      {
        id: "dish-10",
        name: "עמדת פסטה",
        description: "פסטה טרייה בהרכבה אישית עם רטבים לבחירה.",
        image:
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=420&q=80",
        tags: ["עמדה"],
      },
      {
        id: "dish-11",
        name: "עמדת שווארמה",
        description: "שווארמה חמה עם לאפות, טחינה וסלטים.",
        image:
          "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=420&q=80",
        tags: ["עמדה", "בשרי"],
      },
      {
        id: "dish-12",
        name: "עמדת סושי",
        description: "מגוון רולים טריים, סויה, ג׳ינג׳ר ווואסאבי.",
        image:
          "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=420&q=80",
        tags: ["עמדה", "דג"],
      },
      {
        id: "dish-13",
        name: "עמדת סלטים",
        description: "בר סלטים טריים עם ירקות, רטבים ותוספות.",
        image:
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=420&q=80",
        tags: ["צמחוני"],
      },
      {
        id: "dish-14",
        name: "עמדת דגים",
        description: "מבחר דגים חמים וקרים להגשה בקבלת הפנים.",
        image:
          "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=420&q=80",
        tags: ["דג"],
      },
      {
        id: "dish-15",
        name: "עמדת אסייתי",
        description: "נודלס, מוקפצים, ירקות ורטבים אסייתיים.",
        image:
          "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=420&q=80",
        tags: ["עמדה"],
      },
    ],
  },
  {
    id: "cat-desserts",
    title: "קינוחים",
    subtitle: "בחרו קינוחים אישיים או בר קינוחים לסיום האירוע",
    minChoices: 2,
    maxChoices: 4,
    dishes: [
      {
        id: "dish-16",
        name: "מיני פבלובה",
        description: "מרנג אישי עם קרם וניל ופירות יער.",
        image:
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=420&q=80",
        tags: ["קינוח"],
      },
      {
        id: "dish-17",
        name: "מוס שוקולד",
        description: "מוס שוקולד עשיר בכוס אישית.",
        image:
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=420&q=80",
        tags: ["קינוח"],
      },
      {
        id: "dish-18",
        name: "פאי לימון",
        description: "פאי לימון אישי עם מרנג צרוב.",
        image:
          "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=420&q=80",
        tags: ["קינוח"],
      },
      {
        id: "dish-19",
        name: "בר פירות",
        description: "מבחר פירות עונתיים חתוכים ומוגשים בבר עשיר.",
        image:
          "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=420&q=80",
        tags: ["פרווה"],
      },
    ],
  },
];

function initialSelections(): SelectionMap {
  return {
    "cat-starters": [],
    "cat-main": [],
    "cat-buffet": [],
    "cat-desserts": [],
  };
}

export default function EventMenuChoosePage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "evt-1001";

  const [selections, setSelections] = useState<SelectionMap>(initialSelections);
  const [activeCategoryId, setActiveCategoryId] = useState(menuCategories[0].id);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const activeCategory =
    menuCategories.find((category) => category.id === activeCategoryId) || menuCategories[0];

  const summary = useMemo(() => {
    const totalRequired = menuCategories.reduce((sum, category) => sum + category.minChoices, 0);
    const totalMax = menuCategories.reduce((sum, category) => sum + category.maxChoices, 0);
    const totalSelected = Object.values(selections).reduce((sum, ids) => sum + ids.length, 0);

    const validCategories = menuCategories.filter((category) => {
      const count = selections[category.id]?.length || 0;
      return count >= category.minChoices && count <= category.maxChoices;
    }).length;

    const allValid = validCategories === menuCategories.length;

    return {
      totalRequired,
      totalMax,
      totalSelected,
      validCategories,
      allValid,
    };
  }, [selections]);

  const toggleDish = (category: MenuCategory, dishId: string) => {
    setSelections((current) => {
      const currentIds = current[category.id] || [];
      const exists = currentIds.includes(dishId);

      if (exists) {
        return {
          ...current,
          [category.id]: currentIds.filter((id) => id !== dishId),
        };
      }

      if (currentIds.length >= category.maxChoices) {
        return {
          ...current,
          [category.id]: [...currentIds.slice(1), dishId],
        };
      }

      return {
        ...current,
        [category.id]: [...currentIds, dishId],
      };
    });
  };

  const getCategoryStatus = (category: MenuCategory) => {
    const count = selections[category.id]?.length || 0;

    if (count < category.minChoices) {
      return {
        valid: false,
        label: `בחרו לפחות ${category.minChoices}`,
        className: "bg-amber-50 text-amber-700",
      };
    }

    return {
      valid: true,
      label: "תקין",
      className: "bg-emerald-50 text-emerald-700",
    };
  };

  const selectedDishesForCategory = (category: MenuCategory) => {
    const selectedIds = selections[category.id] || [];
    return category.dishes.filter((dish) => selectedIds.includes(dish.id));
  };

  const saveSelections = () => {
    setSaving(true);

    window.setTimeout(() => {
      setSaving(false);
      setSuccessOpen(true);
    }, 800);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-7">
        <header className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
          <div className="relative min-h-[230px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#f2dcad,transparent_34%),linear-gradient(135deg,#fffdf8,#f8efe1)]" />
            <div className="relative z-10 flex min-h-[230px] flex-col justify-between gap-6 p-6 md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                    <span>בחירת מנות</span>
                    <span>›</span>
                    <span>{eventData.hallName}</span>
                    <span>›</span>
                    <span>{eventData.title}</span>
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#b98121] shadow-sm">
                      <Utensils size={34} />
                    </div>

                    <div>
                      <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                        בחירת מנות לאירוע
                      </h1>
                      <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                        סמנו את המנות שתרצו בתפריט. לאחר השמירה, הבחירה תתעדכן בתפריט האירוע במערכת.
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/venues/dashboard/events/${eventId}`}
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-[#eadfce] bg-white/85 px-4 text-sm font-black text-[#6f6252] transition hover:bg-white"
                >
                  <ArrowRight size={17} />
                  חזרה לאירוע
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroInfo label="אירוע" value={eventData.title} />
                <HeroInfo label="תאריך" value={eventData.date} />
                <HeroInfo label="תפריט" value={eventData.menuName} />
                <HeroInfo
                  label="סטטוס"
                  value={summary.allValid ? "מוכן לשמירה" : "בחירה בתהליך"}
                  success={summary.allValid}
                />
              </div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="מנות שסומנו"
            value={`${summary.totalSelected}`}
            subtitle={`מתוך עד ${summary.totalMax}`}
          />
          <MetricCard
            title="מינימום נדרש"
            value={`${summary.totalRequired}`}
            subtitle="לפי הגדרות האולם"
          />
          <MetricCard
            title="קטגוריות תקינות"
            value={`${summary.validCategories}/${menuCategories.length}`}
            subtitle="עמדו בכמות הבחירה"
          />
          <MetricCard
            title="סטטוס שמירה"
            value={summary.allValid ? "אפשר לשמור" : "חסר בחירות"}
            subtitle="המערכת בודקת מינימום לכל קטגוריה"
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[270px_1fr_340px]">
          <aside className="space-y-5">
            <Panel title="קטגוריות" icon={<Utensils size={18} />}>
              <div className="space-y-2">
                {menuCategories.map((category) => {
                  const count = selections[category.id]?.length || 0;
                  const status = getCategoryStatus(category);

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategoryId(category.id)}
                      className={[
                        "w-full rounded-2xl border p-3 text-right transition hover:bg-[#fbf5ea]",
                        activeCategoryId === category.id
                          ? "border-[#d9bd83] bg-[#fff8eb]"
                          : "border-[#eadfce] bg-[#fffdf8]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-[#2b241c]">{category.title}</div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${status.className}`}>
                          {count}/{category.maxChoices}
                        </span>
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                        חובה לפחות {category.minChoices}, עד {category.maxChoices}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="הנחיות" icon={<Sparkles size={18} />}>
              <div className="space-y-3 text-sm font-bold leading-7 text-[#7f705d]">
                <p>בחרו את המנות הרצויות בכל קטגוריה.</p>
                <p>אם בחרתם יותר מהמקסימום, הבחירה הישנה ביותר תוסר אוטומטית.</p>
                <p>לאחר השמירה, האולם יראה את הבחירות בתפריט האירוע.</p>
              </div>
            </Panel>
          </aside>

          <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-black text-[#2b241c]">
                    {activeCategory.title}
                  </h2>

                  <span className="rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
                    בחרו {activeCategory.minChoices} מתוך {activeCategory.maxChoices}
                  </span>
                </div>

                <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                  {activeCategory.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSummaryOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#6f6252]"
              >
                <Eye size={16} />
                צפייה בסיכום
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {activeCategory.dishes.map((dish) => {
                const selected = (selections[activeCategory.id] || []).includes(dish.id);

                return (
                  <DishChoiceCard
                    key={dish.id}
                    dish={dish}
                    selected={selected}
                    onClick={() => toggleDish(activeCategory, dish.id)}
                  />
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <Panel title="סיכום בחירה" icon={<CheckCircle2 size={18} />}>
              <div className="space-y-3">
                {menuCategories.map((category) => {
                  const selectedDishes = selectedDishesForCategory(category);
                  const status = getCategoryStatus(category);

                  return (
                    <div key={category.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-[#2b241c]">
                          {category.title}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-bold leading-6 text-[#7f705d]">
                        {selectedDishes.length > 0
                          ? selectedDishes.map((dish) => dish.name).join(" · ")
                          : "לא נבחרו מנות עדיין"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="הערות לאולם" icon={<Clock3 size={18} />}>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="לדוגמה: חשוב לנו שיהיו מספיק מנות צמחוניות / ללא גלוטן..."
                className="min-h-[135px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold leading-7 text-[#2b241c] outline-none focus:border-[#b98121]"
              />
            </Panel>

            <button
              type="button"
              onClick={saveSelections}
              disabled={!summary.allValid || saving}
              className="flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:bg-[#d8c9b0]"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              שמירת בחירת מנות
            </button>
          </aside>
        </section>
      </div>

      {summaryOpen && (
        <Modal title="סיכום בחירת מנות" onClose={() => setSummaryOpen(false)}>
          <div className="space-y-3">
            {menuCategories.map((category) => {
              const selectedDishes = selectedDishesForCategory(category);

              return (
                <div key={category.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                  <div className="text-sm font-black text-[#2b241c]">{category.title}</div>
                  <div className="mt-2 text-xs font-bold leading-6 text-[#7f705d]">
                    {selectedDishes.length > 0
                      ? selectedDishes.map((dish) => dish.name).join(" · ")
                      : "לא נבחרו מנות"}
                  </div>
                </div>
              );
            })}

            {notes ? (
              <div className="rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-3">
                <div className="text-sm font-black text-[#2b241c]">הערות</div>
                <div className="mt-2 text-xs font-bold leading-6 text-[#7f705d]">{notes}</div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {successOpen && (
        <Modal title="הבחירה נשמרה בהצלחה" onClose={() => setSuccessOpen(false)}>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={34} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-[#2b241c]">
              בחירת המנות נשמרה
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-7 text-[#7f705d]">
              הבחירה עודכנה בתפריט האירוע במערכת. האולם יוכל לראות את הבחירות, לאשר אותן
              ולהמשיך לסגירת התפריט הסופי.
            </p>

            <button
              type="button"
              onClick={() => setSuccessOpen(false)}
              className="mt-5 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              סגירה
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function HeroInfo({
  label,
  value,
  success,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-1 text-base font-black",
          success ? "text-emerald-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
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
      <div className="mt-1 text-xs font-bold leading-5 text-[#9b8a73]">{subtitle}</div>
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

function DishChoiceCard({
  dish,
  selected,
  onClick,
}: {
  dish: Dish;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "overflow-hidden rounded-[26px] border bg-white text-right shadow-sm transition hover:-translate-y-1 hover:shadow-md",
        selected ? "border-emerald-300 ring-2 ring-emerald-100" : "border-[#eadfce]",
      ].join(" ")}
    >
      <div className="relative h-40 overflow-hidden">
        <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

        <div
          className={[
            "absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black",
            selected
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-white/70 bg-white/85 text-transparent",
          ].join(" ")}
        >
          ✓
        </div>

        <div className="absolute bottom-3 right-3 left-3">
          <h3 className="text-lg font-black text-white">{dish.name}</h3>
        </div>
      </div>

      <div className="p-4">
        <p className="min-h-[44px] text-sm font-bold leading-6 text-[#7f705d]">
          {dish.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {dish.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#fff8eb] px-2.5 py-1 text-[11px] font-black text-[#9f6f1a]">
              {tag}
            </span>
          ))}
        </div>

        <div
          className={[
            "mt-4 flex h-10 items-center justify-center gap-2 rounded-2xl text-sm font-black",
            selected ? "bg-emerald-50 text-emerald-700" : "bg-[#f4ead9] text-[#b98121]",
          ].join(" ")}
        >
          <CheckCircle2 size={16} />
          {selected ? "נבחר" : "בחירה"}
        </div>
      </div>
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-2xl">
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
