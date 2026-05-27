"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Save,
  Sparkles,
  Utensils,
} from "lucide-react";

type PublicDish = {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
};

type PublicCategory = {
  id: string;
  title: string;
  subtitle: string;
  eventNote: string;
  chooseCount: number;
  originalChooseCount: number;
  dishes: PublicDish[];
};

type PublicMenu = {
  id: string;
  name: string;
  description: string;
  type: string;
  eventNote: string;
  status: string;
  submittedAt?: string | null;
  customerNote: string;
  submittedByName: string;
  submittedByPhone: string;
  categories: PublicCategory[];
  selectedDishes: {
    categoryId: string;
    categoryTitle: string;
    dishId: string;
    dishName: string;
  }[];
};

type SelectedMap = Record<string, string[]>;

function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function PublicMenuChoosePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";

  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [selected, setSelected] = useState<SelectedMap>({});
  const [submittedByName, setSubmittedByName] = useState("");
  const [submittedByPhone, setSubmittedByPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const totalCategories = menu?.categories.length || 0;

  const completedCategories = useMemo(() => {
    if (!menu) return 0;

    return menu.categories.filter((category) => {
      const count = selected[category.id]?.length || 0;
      return count === category.chooseCount;
    }).length;
  }, [menu, selected]);

  const progress =
    totalCategories > 0
      ? Math.round((completedCategories / totalCategories) * 100)
      : 0;

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function fetchMenu() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/menus/choose/${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || "טעינת התפריט נכשלה");
        }

        const nextMenu: PublicMenu = data.menu;

        const initialSelected: SelectedMap = {};

        nextMenu.categories.forEach((category) => {
          initialSelected[category.id] = nextMenu.selectedDishes
            .filter((item) => item.categoryId === category.id)
            .map((item) => item.dishId);
        });

        if (!cancelled) {
          setMenu(nextMenu);
          setSelected(initialSelected);
          setSubmittedByName(nextMenu.submittedByName || "");
          setSubmittedByPhone(nextMenu.submittedByPhone || "");
          setCustomerNote(nextMenu.customerNote || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "טעינת התפריט נכשלה");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMenu();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggleDish = (category: PublicCategory, dish: PublicDish) => {
    setSuccessMessage("");
    setError("");

    setSelected((current) => {
      const currentList = current[category.id] || [];
      const alreadySelected = currentList.includes(dish.id);

      if (alreadySelected) {
        return {
          ...current,
          [category.id]: currentList.filter((id) => id !== dish.id),
        };
      }

      if (currentList.length >= category.chooseCount) {
        return {
          ...current,
          [category.id]: [...currentList.slice(1), dish.id],
        };
      }

      return {
        ...current,
        [category.id]: [...currentList, dish.id],
      };
    });
  };

  const validateBeforeSave = () => {
    if (!menu) return "התפריט לא נטען";

    for (const category of menu.categories) {
      const selectedCount = selected[category.id]?.length || 0;

      if (selectedCount !== category.chooseCount) {
        return `בקטגוריה "${category.title}" צריך לבחור בדיוק ${category.chooseCount} מנות`;
      }
    }

    return "";
  };

  const saveSelection = async () => {
    if (!menu) return;

    const validationError = validateBeforeSave();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const selectedDishes = menu.categories.flatMap((category) => {
        const selectedIds = selected[category.id] || [];

        return selectedIds
          .map((dishId) => {
            const dish = category.dishes.find((item) => item.id === dishId);
            if (!dish) return null;

            return {
              categoryId: category.id,
              categoryTitle: category.title,
              dishId: dish.id,
              dishName: dish.name,
            };
          })
          .filter(Boolean);
      });

      const res = await fetch(`/api/menus/choose/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedDishes,
          submittedByName,
          submittedByPhone,
          customerNote,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "שמירת הבחירה נכשלה");
      }

      setMenu(data.menu);
      setSuccessMessage("בחירת המנות נשמרה בהצלחה");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת הבחירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f1e5] px-4 py-10 text-[#2d2419]">
        <div className="mx-auto max-w-xl rounded-[34px] border border-[#ead8b5] bg-white p-8 text-center shadow-xl">
          <Loader2 className="mx-auto animate-spin text-[#b98121]" size={36} />
          <h1 className="mt-4 text-2xl font-black">טוען את התפריט...</h1>
          <p className="mt-2 text-sm font-bold text-[#806945]">
            אנחנו מכינים עבורך את בחירת המנות לאירוע.
          </p>
        </div>
      </main>
    );
  }

  if (error && !menu) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f1e5] px-4 py-10 text-[#2d2419]">
        <div className="mx-auto max-w-xl rounded-[34px] border border-rose-200 bg-white p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto text-rose-600" size={42} />
          <h1 className="mt-4 text-2xl font-black text-rose-700">
            לא ניתן לפתוח את התפריט
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#806945]">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!menu) return null;

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#f8f1e5] text-[#2d2419]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(210,157,60,0.22),transparent_30%),radial-gradient(circle_at_5%_15%,rgba(255,255,255,0.8),transparent_28%),linear-gradient(180deg,#fbf7ef_0%,#f8f1e5_48%,#f3e7d2_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[260px] bg-[linear-gradient(180deg,rgba(111,74,21,0.08)_0%,rgba(205,154,62,0.06)_42%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-7">
        <header className="overflow-hidden rounded-[40px] border border-[#e4cfaa] bg-[#fffaf1]/95 p-6 shadow-[0_20px_70px_rgba(76,52,21,0.12)] backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dfc28a] bg-white/70 px-3 py-1 text-xs font-black text-[#9a6b24]">
                <Sparkles size={14} />
                בחירת מנות אישית לאירוע
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-[#2d2419] md:text-6xl">
                {menu.name}
              </h1>

              {menu.description ? (
                <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#7c694f] md:text-base">
                  {menu.description}
                </p>
              ) : null}

              {menu.eventNote ? (
                <div className="mt-4 rounded-[24px] border border-[#dfc28a] bg-[#fff4da] p-4 text-sm font-bold leading-7 text-[#72552c]">
                  <span className="font-black text-[#2d2419]">הערת האולם: </span>
                  {menu.eventNote}
                </div>
              ) : null}
            </div>

            <div className="rounded-[30px] border border-[#e4cfaa] bg-white p-4 shadow-sm md:w-[260px]">
              <div className="flex items-center justify-between text-xs font-black text-[#806945]">
                <span>התקדמות בחירה</span>
                <span>{progress}%</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0e2c7]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#d8a241,#b67b1d)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 text-sm font-black text-[#2d2419]">
                {completedCategories} מתוך {totalCategories} קטגוריות הושלמו
              </div>

              {menu.submittedAt ? (
                <div className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  נשמר לאחרונה: {formatDateTime(menu.submittedAt)}
                </div>
              ) : (
                <div className="mt-2 rounded-2xl bg-[#fff3d8] px-3 py-2 text-xs font-black text-[#8c5f19]">
                  עדיין לא נשמרה בחירה
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[34px] border border-[#e4cfaa] bg-white/90 p-5 shadow-[0_16px_45px_rgba(76,52,21,0.08)] backdrop-blur-xl">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-black text-[#806945]">
                שם ממלא הבחירה
              </span>
              <input
                value={submittedByName}
                onChange={(event) => setSubmittedByName(event.target.value)}
                placeholder="לדוגמה: הדר"
                className="h-12 w-full rounded-2xl border border-[#e4cfaa] bg-[#fffdf8] px-4 text-sm font-bold outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d8a241]/10"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-black text-[#806945]">
                טלפון
              </span>
              <input
                value={submittedByPhone}
                onChange={(event) => setSubmittedByPhone(event.target.value)}
                placeholder="0500000000"
                className="h-12 w-full rounded-2xl border border-[#e4cfaa] bg-[#fffdf8] px-4 text-sm font-bold outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d8a241]/10"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-black text-[#806945]">
              הערות לבחירת המנות
            </span>
            <textarea
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              placeholder="לדוגמה: נשמח לשים לב לרגישויות, טבעונים או בקשות מיוחדות..."
              className="min-h-[90px] w-full rounded-2xl border border-[#e4cfaa] bg-[#fffdf8] p-4 text-sm font-bold leading-7 outline-none transition focus:border-[#b98121] focus:ring-4 focus:ring-[#d8a241]/10"
            />
          </label>
        </section>

        <section className="mt-5 space-y-5">
          {menu.categories.map((category, categoryIndex) => {
            const selectedIds = selected[category.id] || [];
            const selectedCount = selectedIds.length;
            const isComplete = selectedCount === category.chooseCount;

            return (
              <section
                key={category.id}
                className="overflow-hidden rounded-[38px] border border-[#e4cfaa] bg-[#fffaf1]/95 shadow-[0_18px_55px_rgba(76,52,21,0.09)] backdrop-blur-xl"
              >
                <div className="border-b border-[#ead8b5] bg-[linear-gradient(135deg,#fff8e8,#f6e4bd)] p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] text-sm font-black text-white shadow-lg">
                          {categoryIndex + 1}
                        </div>

                        <div>
                          <h2 className="text-2xl font-black text-[#2d2419]">
                            {category.title}
                          </h2>

                          {category.subtitle ? (
                            <p className="mt-1 text-sm font-bold text-[#806945]">
                              {category.subtitle}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {category.eventNote ? (
                        <div className="mt-4 rounded-2xl border border-[#dfc28a] bg-white/70 p-3 text-sm font-bold leading-7 text-[#72552c]">
                          <span className="font-black text-[#2d2419]">
                            הערה לקטגוריה:{" "}
                          </span>
                          {category.eventNote}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={[
                        "rounded-2xl border px-4 py-3 text-sm font-black",
                        isComplete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#dfc28a] bg-white text-[#8c5f19]",
                      ].join(" ")}
                    >
                      {isComplete ? (
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          הושלם
                        </span>
                      ) : (
                        <span>
                          בחרו {category.chooseCount} מתוך {category.dishes.length}
                        </span>
                      )}

                      <div className="mt-1 text-xs font-bold opacity-80">
                        נבחרו {selectedCount}/{category.chooseCount}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6">
                  {category.dishes.length ? (
                    category.dishes.map((dish) => {
                      const checked = selectedIds.includes(dish.id);

                      return (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() => toggleDish(category, dish)}
                          className={[
                            "group overflow-hidden rounded-[30px] border bg-white text-right shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(76,52,21,0.13)]",
                            checked
                              ? "border-[#b98121] ring-4 ring-[#d8a241]/15"
                              : "border-[#ead8b5] hover:border-[#d8a241]",
                          ].join(" ")}
                        >
                          <div className="relative h-44 overflow-hidden bg-[#fff0cd]">
                            {dish.image ? (
                              <img
                                src={dish.image}
                                alt={dish.name}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#a66b18]">
                                <Utensils size={42} />
                              </div>
                            )}

                            <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#8c5f19] shadow-sm">
                              {checked ? "נבחר" : "בחירה"}
                            </div>

                            {checked ? (
                              <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                                <CheckCircle2 size={20} />
                              </div>
                            ) : null}
                          </div>

                          <div className="p-4">
                            <h3 className="text-lg font-black text-[#2d2419]">
                              {dish.name}
                            </h3>

                            <p className="mt-2 min-h-[44px] text-sm font-bold leading-6 text-[#806945]">
                              {dish.description || "מנה מתוך תפריט האולם"}
                            </p>

                            {dish.tags.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {dish.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-[#fff3d8] px-2.5 py-1 text-[11px] font-black text-[#8c5f19]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full rounded-[28px] border border-dashed border-[#d8b874] bg-white p-8 text-center">
                      <Utensils className="mx-auto text-[#b98121]" size={34} />
                      <div className="mt-3 text-lg font-black">
                        אין מנות בקטגוריה הזאת
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </section>

        {(error || successMessage) && (
          <div
            className={[
              "mt-5 rounded-[28px] border p-4 text-sm font-black leading-7",
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {error || successMessage}
          </div>
        )}

        <div className="sticky bottom-4 z-20 mt-8 rounded-[30px] border border-[#e4cfaa] bg-white/95 p-4 shadow-[0_18px_55px_rgba(76,52,21,0.16)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-black text-[#2d2419]">
                {completedCategories} מתוך {totalCategories} קטגוריות הושלמו
              </div>
              <div className="mt-1 text-xs font-bold text-[#806945]">
                יש להשלים את כל הבחירות לפני שמירה.
              </div>
            </div>

            <button
              type="button"
              onClick={saveSelection}
              disabled={saving}
              className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d8a241,#b67b1d)] px-7 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(156,101,23,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "שומר..." : "שמירת בחירת המנות"}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}