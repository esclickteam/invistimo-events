"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Edit3,
  Eye,
  Link2,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";

type SelectionEditMode = "untilDate" | "lockAfterSubmit";

type VenueMenuCategoryRule = {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  dishesCount: number;
};

type VenueMenuTemplate = {
  id: string;
  _id?: string;
  name: string;
  type?: string;
  categories: number;
  dishes: number;
  status: "active" | "draft";
  description: string;
  categoryRules: VenueMenuCategoryRule[];
};

type AssignedMenuCategoryOverride = VenueMenuCategoryRule & {
  originalMinChoices: number;
  originalMaxChoices: number;
  eventMinChoices: number;
  eventMaxChoices: number;
  eventNote: string;
};

type KitchenReportStatus = "draft" | "submitted";

type KitchenReportDish = {
  id: string;
  dishId?: string;
  categoryId?: string;
  categoryTitle: string;
  dishName: string;
  plannedQuantity: number;
  actualServedQuantity: number;
  notes: string;
};

type KitchenSpecialNoteType =
  | "allergy"
  | "kosher"
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "kids"
  | "other";

type KitchenSpecialNote = {
  id: string;
  type: KitchenSpecialNoteType;
  title: string;
  quantity: number;
  notes: string;
};

type AssignedMenu = {
  id: string;
  templateId: string;
  name: string;
  publicToken?: string;
  publicLink?: string;
  eventNote?: string;

  selectionEditMode?: SelectionEditMode;
  selectionEditableUntil?: string | null;
  lockedAt?: string | null;
  lockedReason?: string;

  sentToCouple: boolean;
  coupleSelected: boolean;
  approved: boolean;
  selectedAt?: string;
  submittedAt?: string;
  updatedAt?: string;

  selectedDishes?: {
    categoryId: string;
    categoryTitle: string;
    dishId: string;
    dishName: string;
  }[];

  customerNote?: string;
  submittedByName?: string;
  submittedByPhone?: string;

  kitchenReportStatus?: KitchenReportStatus;
  kitchenReportUpdatedAt?: string;
  kitchenReportSubmittedAt?: string;
  kitchenGeneralNotes?: string;
  kitchenDishes?: KitchenReportDish[];
  kitchenSpecialNotes?: KitchenSpecialNote[];

  categoryOverrides: AssignedMenuCategoryOverride[];
};

type EventMenuTabProps = {
  eventId: string;
  hallId: string;
  assignedMenu: AssignedMenu | null;
  templates: VenueMenuTemplate[];
  menusLoading: boolean;
  menuError: string;
  menuSaving: boolean;
  onChooseMenu: () => void;
  onSendToCouple: () => void;
  onUpdateEventNote: (value: string) => void;
  onUpdateCategory: (
    categoryId: string,
    field: "eventChoices" | "eventNote",
    value: string
  ) => void;
  onUpdateSelectionPolicy: (
    patch: Partial<Pick<AssignedMenu, "selectionEditMode" | "selectionEditableUntil">>
  ) => void;
  onSaveChanges: () => void;
  onSaveKitchenReport: (
    payload: Pick<
      AssignedMenu,
      | "kitchenReportStatus"
      | "kitchenGeneralNotes"
      | "kitchenDishes"
      | "kitchenSpecialNotes"
    >
  ) => void | Promise<void>;
};

type KitchenCategoryGroup = {
  key: string;
  categoryId: string;
  categoryTitle: string;
  rows: KitchenReportDish[];
  plannedTotal: number;
  actualTotal: number;
};

const CATEGORY_GENERAL_DISH_ID = "__category_general__";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuantity(value: unknown) {
  return Math.max(0, toNumber(value, 0));
}

function formatDateTime(value?: string) {
  if (!value) return "לא הוגדר";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateTimeInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function normalizeKitchenDishes(raw: any): KitchenReportDish[] {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => ({
    id: String(item?.id || item?._id || item?.dishId || `kitchen-dish-${index + 1}`),
    dishId: item?.dishId ? String(item.dishId) : "",
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    categoryTitle: String(item?.categoryTitle || item?.categoryName || "כללי"),
    dishName: String(item?.dishName || item?.name || "מנה ללא שם"),
    plannedQuantity: normalizeQuantity(item?.plannedQuantity),
    actualServedQuantity: normalizeQuantity(item?.actualServedQuantity),
    notes: String(item?.notes || ""),
  }));
}

function kitchenSpecialTypeLabel(type: KitchenSpecialNoteType) {
  if (type === "allergy") return "אלרגיה / רגישות";
  if (type === "kosher") return "כשרות";
  if (type === "vegetarian") return "צמחוני";
  if (type === "vegan") return "טבעוני";
  if (type === "gluten_free") return "ללא גלוטן";
  if (type === "kids") return "ילדים";
  return "אחר";
}

function getDishMatchKey(categoryId?: string, dishId?: string) {
  return `${categoryId || "category"}::${dishId || "dish"}`;
}

function getCategoryGeneralRowId(categoryId: string, index = 0) {
  return `category-general-${categoryId || index}`;
}

function buildKitchenDishesFromSelectedMenu(menu: AssignedMenu | null): KitchenReportDish[] {
  if (!menu) return [];

  const existingRows = normalizeKitchenDishes(menu.kitchenDishes);
  const existingByDish = new Map<string, KitchenReportDish>();

  existingRows.forEach((row) => {
    if (!row.dishId || row.dishId === CATEGORY_GENERAL_DISH_ID) return;
    existingByDish.set(getDishMatchKey(row.categoryId, row.dishId), row);
  });

  const selectedDishes = Array.isArray(menu.selectedDishes) ? menu.selectedDishes : [];

  if (selectedDishes.length) {
    const selectedKeys = new Set<string>();

    const rowsFromSelection = selectedDishes.map((dish, index) => {
      const key = getDishMatchKey(dish.categoryId, dish.dishId);
      selectedKeys.add(key);

      const existing = existingByDish.get(key);

      return {
        id: existing?.id || `${dish.categoryId || "category"}-${dish.dishId || index}`,
        dishId: dish.dishId,
        categoryId: dish.categoryId,
        categoryTitle: dish.categoryTitle || "כללי",
        dishName: dish.dishName || "מנה ללא שם",
        plannedQuantity: existing?.plannedQuantity || 0,
        actualServedQuantity: existing?.actualServedQuantity || 0,
        notes: existing?.notes || "",
      };
    });

    const extraRowsToKeep = existingRows.filter((row) => {
      const isCategoryGeneral = row.dishId === CATEGORY_GENERAL_DISH_ID;
      const isManual = !row.dishId;
      const isNotSelectedDish = row.dishId
        ? !selectedKeys.has(getDishMatchKey(row.categoryId, row.dishId))
        : true;

      return isCategoryGeneral || isManual || isNotSelectedDish;
    });

    return [...extraRowsToKeep, ...rowsFromSelection];
  }

  if (existingRows.length) return existingRows;

  return menu.categoryOverrides.map((category, index) => ({
    id: getCategoryGeneralRowId(category.id, index),
    dishId: CATEGORY_GENERAL_DISH_ID,
    categoryId: category.id,
    categoryTitle: category.name,
    dishName: "סימון כללי לקטגוריה",
    plannedQuantity: 0,
    actualServedQuantity: 0,
    notes: "",
  }));
}

function groupKitchenDishes(rows: KitchenReportDish[]): KitchenCategoryGroup[] {
  const map = new Map<string, KitchenCategoryGroup>();

  rows.forEach((row) => {
    const categoryId = row.categoryId || "general";
    const categoryTitle = row.categoryTitle || "כללי";
    const key = `${categoryId}::${categoryTitle}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        categoryId,
        categoryTitle,
        rows: [],
        plannedTotal: 0,
        actualTotal: 0,
      });
    }

    const group = map.get(key)!;
    group.rows.push(row);
    group.plannedTotal += normalizeQuantity(row.plannedQuantity);
    group.actualTotal += normalizeQuantity(row.actualServedQuantity);
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.categoryTitle === "כללי") return 1;
    if (b.categoryTitle === "כללי") return -1;
    return a.categoryTitle.localeCompare(b.categoryTitle, "he");
  });
}

export default function EventMenuTab({
  eventId,
  hallId,
  assignedMenu,
  templates,
  menusLoading,
  menuError,
  menuSaving,
  onChooseMenu,
  onSendToCouple,
  onUpdateEventNote,
  onUpdateCategory,
  onUpdateSelectionPolicy,
  onSaveChanges,
  onSaveKitchenReport,
}: EventMenuTabProps) {
  const [menuView, setMenuView] = useState<"overview" | "live">(() => {
    if (typeof window === "undefined") return "overview";

    const saved = sessionStorage.getItem(`event-menu-view-${eventId}`);
    return saved === "live" || saved === "overview" ? saved : "overview";
  });

  const savingRef = useRef(false);
  const pendingSaveRef = useRef<Pick<
    AssignedMenu,
    | "kitchenReportStatus"
    | "kitchenGeneralNotes"
    | "kitchenDishes"
    | "kitchenSpecialNotes"
  > | null>(null);

  const publicLink =
    assignedMenu?.publicLink ||
    `https://www.invistimo.com/menus/choose/${assignedMenu?.publicToken || eventId}`;

  const selectedDishGroups = (assignedMenu?.selectedDishes || []).reduce(
    (groups, item) => {
      const key = item.categoryTitle || "קטגוריה";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, NonNullable<AssignedMenu["selectedDishes"]>>
  );

  const initialKitchenDishes = useMemo(
    () => buildKitchenDishesFromSelectedMenu(assignedMenu),
    [assignedMenu?.id, assignedMenu?.updatedAt, assignedMenu?.submittedAt]
  );

  const [kitchenDishes, setKitchenDishes] =
    useState<KitchenReportDish[]>(initialKitchenDishes);

  const [kitchenSpecialNotes, setKitchenSpecialNotes] = useState<KitchenSpecialNote[]>(
    assignedMenu?.kitchenSpecialNotes || []
  );

  const [kitchenGeneralNotes, setKitchenGeneralNotes] = useState(
    assignedMenu?.kitchenGeneralNotes || ""
  );

  const [kitchenReportStatus, setKitchenReportStatus] =
    useState<KitchenReportStatus>(assignedMenu?.kitchenReportStatus || "draft");

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!eventId || typeof window === "undefined") return;
    sessionStorage.setItem(`event-menu-view-${eventId}`, menuView);
  }, [eventId, menuView]);

  useEffect(() => {
    const nextRows = buildKitchenDishesFromSelectedMenu(assignedMenu);
    setKitchenDishes(nextRows);
    setKitchenSpecialNotes(assignedMenu?.kitchenSpecialNotes || []);
    setKitchenGeneralNotes(assignedMenu?.kitchenGeneralNotes || "");
    setKitchenReportStatus(assignedMenu?.kitchenReportStatus || "draft");

    const groups = groupKitchenDishes(nextRows);
    setExpandedCategories((current) => {
      const next = { ...current };
      groups.forEach((group) => {
        if (next[group.key] === undefined) next[group.key] = true;
      });
      return next;
    });
  }, [assignedMenu?.id, assignedMenu?.updatedAt, assignedMenu?.submittedAt]);

  const categoryGroups = useMemo(
    () => groupKitchenDishes(kitchenDishes),
    [kitchenDishes]
  );

  const totalEstimated = kitchenDishes.reduce(
    (sum, item) => sum + normalizeQuantity(item.plannedQuantity),
    0
  );

  const totalActual = kitchenDishes.reduce(
    (sum, item) => sum + normalizeQuantity(item.actualServedQuantity),
    0
  );

  const totalSpecial = kitchenSpecialNotes.reduce(
    (sum, item) => sum + normalizeQuantity(item.quantity),
    0
  );

  const saveLiveKitchenNow = async (
    payload: Pick<
      AssignedMenu,
      | "kitchenReportStatus"
      | "kitchenGeneralNotes"
      | "kitchenDishes"
      | "kitchenSpecialNotes"
    >
  ) => {
    if (savingRef.current) {
      pendingSaveRef.current = payload;
      return;
    }

    savingRef.current = true;

    try {
      await onSaveKitchenReport(payload);
    } finally {
      savingRef.current = false;

      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;

      if (pending) {
        await saveLiveKitchenNow(pending);
      }
    }
  };

  const saveWithNextRows = (nextRows: KitchenReportDish[]) => {
    setKitchenReportStatus("draft");
    setKitchenDishes(nextRows);

    void saveLiveKitchenNow({
      kitchenReportStatus: "draft",
      kitchenGeneralNotes,
      kitchenDishes: nextRows,
      kitchenSpecialNotes,
    });
  };

  const saveWithNextSpecialNotes = (nextNotes: KitchenSpecialNote[]) => {
    setKitchenReportStatus("draft");
    setKitchenSpecialNotes(nextNotes);

    void saveLiveKitchenNow({
      kitchenReportStatus: "draft",
      kitchenGeneralNotes,
      kitchenDishes,
      kitchenSpecialNotes: nextNotes,
    });
  };

  const ensureCategoryGeneralRow = (
    rows: KitchenReportDish[],
    group: KitchenCategoryGroup
  ) => {
    const existing = rows.find(
      (row) =>
        (row.categoryId || "general") === group.categoryId &&
        row.dishId === CATEGORY_GENERAL_DISH_ID
    );

    if (existing) return rows;

    return [
      ...rows,
      {
        id: getCategoryGeneralRowId(group.categoryId),
        dishId: CATEGORY_GENERAL_DISH_ID,
        categoryId: group.categoryId,
        categoryTitle: group.categoryTitle,
        dishName: "סימון כללי לקטגוריה",
        plannedQuantity: 0,
        actualServedQuantity: 0,
        notes: "",
      },
    ];
  };

  const updateKitchenDish = (
    rowId: string,
    field: keyof Pick<
      KitchenReportDish,
      "plannedQuantity" | "actualServedQuantity" | "notes" | "dishName"
    >,
    value: string | number,
    shouldSave = true
  ) => {
    const nextRows = kitchenDishes.map((row) => {
      if (row.id !== rowId) return row;

      if (field === "notes" || field === "dishName") {
        return {
          ...row,
          [field]: String(value),
        };
      }

      return {
        ...row,
        [field]: normalizeQuantity(value),
      };
    });

    if (shouldSave) {
      saveWithNextRows(nextRows);
    } else {
      setKitchenReportStatus("draft");
      setKitchenDishes(nextRows);
    }
  };

  const quickUpdateActualServed = (rowId: string, diff: number) => {
    const nextRows = kitchenDishes.map((row) => {
      if (row.id !== rowId) return row;

      return {
        ...row,
        actualServedQuantity: Math.max(
          0,
          normalizeQuantity(row.actualServedQuantity) + diff
        ),
      };
    });

    saveWithNextRows(nextRows);
  };

  const quickUpdateCategoryActual = (group: KitchenCategoryGroup, diff: number) => {
    let rowsWithCategory = ensureCategoryGeneralRow(kitchenDishes, group);

    rowsWithCategory = rowsWithCategory.map((row) => {
      const isTarget =
        (row.categoryId || "general") === group.categoryId &&
        row.dishId === CATEGORY_GENERAL_DISH_ID;

      if (!isTarget) return row;

      return {
        ...row,
        actualServedQuantity: Math.max(
          0,
          normalizeQuantity(row.actualServedQuantity) + diff
        ),
      };
    });

    saveWithNextRows(rowsWithCategory);
  };

  const setCategoryTotal = (
    group: KitchenCategoryGroup,
    field: "plannedQuantity" | "actualServedQuantity",
    value: string | number
  ) => {
    const targetTotal = normalizeQuantity(value);
    let rowsWithCategory = ensureCategoryGeneralRow(kitchenDishes, group);

    const otherRowsTotal = rowsWithCategory.reduce((sum, row) => {
      const isSameCategory = (row.categoryId || "general") === group.categoryId;
      const isCategoryGeneral = row.dishId === CATEGORY_GENERAL_DISH_ID;

      if (!isSameCategory || isCategoryGeneral) return sum;
      return sum + normalizeQuantity(row[field]);
    }, 0);

    const categoryGeneralValue = Math.max(0, targetTotal - otherRowsTotal);

    rowsWithCategory = rowsWithCategory.map((row) => {
      const isTarget =
        (row.categoryId || "general") === group.categoryId &&
        row.dishId === CATEGORY_GENERAL_DISH_ID;

      if (!isTarget) return row;

      return {
        ...row,
        [field]: categoryGeneralValue,
      };
    });

    saveWithNextRows(rowsWithCategory);
  };

  const addKitchenDish = (group?: KitchenCategoryGroup) => {
    const categoryId = group?.categoryId || "manual";
    const categoryTitle = group?.categoryTitle || "מנה ידנית";

    const nextRows = [
      ...kitchenDishes,
      {
        id: `manual-dish-${Date.now()}`,
        dishId: "",
        categoryId,
        categoryTitle,
        dishName: "",
        plannedQuantity: 0,
        actualServedQuantity: 0,
        notes: "",
      },
    ];

    saveWithNextRows(nextRows);
  };

  const removeKitchenDish = (rowId: string) => {
    const nextRows = kitchenDishes.filter((row) => row.id !== rowId);
    saveWithNextRows(nextRows);
  };

  const addSpecialNote = (type: KitchenSpecialNoteType) => {
    const nextNotes = [
      ...kitchenSpecialNotes,
      {
        id: `special-${Date.now()}`,
        type,
        title: "",
        quantity: 0,
        notes: "",
      },
    ];

    saveWithNextSpecialNotes(nextNotes);
  };

  const updateSpecialNote = (
    rowId: string,
    field: keyof KitchenSpecialNote,
    value: string | number,
    shouldSave = true
  ) => {
    const nextNotes = kitchenSpecialNotes.map((row) => {
      if (row.id !== rowId) return row;

      if (field === "quantity") {
        return {
          ...row,
          quantity: normalizeQuantity(value),
        };
      }

      return {
        ...row,
        [field]: value,
      };
    });

    if (shouldSave) {
      saveWithNextSpecialNotes(nextNotes);
    } else {
      setKitchenReportStatus("draft");
      setKitchenSpecialNotes(nextNotes);
    }
  };

  const removeSpecialNote = (rowId: string) => {
    const nextNotes = kitchenSpecialNotes.filter((row) => row.id !== rowId);
    saveWithNextSpecialNotes(nextNotes);
  };

  const saveGeneralNotes = (value: string) => {
    setKitchenReportStatus("draft");
    setKitchenGeneralNotes(value);

    void saveLiveKitchenNow({
      kitchenReportStatus: "draft",
      kitchenGeneralNotes: value,
      kitchenDishes,
      kitchenSpecialNotes,
    });
  };

  const markKitchenReportSubmitted = () => {
    setKitchenReportStatus("submitted");

    void saveLiveKitchenNow({
      kitchenReportStatus: "submitted",
      kitchenGeneralNotes,
      kitchenDishes,
      kitchenSpecialNotes,
    });
  };

  if (!assignedMenu) {
    return (
      <MainCard title="תפריט האירוע" icon={<Utensils size={19} />}>
        {menuError && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {menuError}
          </div>
        )}

        <div className="rounded-[34px] border border-dashed border-[#d9bd83] bg-gradient-to-br from-[#fffaf0] via-white to-[#f6ead7] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#b98121] shadow-sm">
            <Utensils size={32} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#2b241c]">
            עדיין לא נבחר תפריט לאירוע
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
            בוחרים מתוך התפריטים שהאולם הגדיר מראש. אחרי הבחירה נוצר עותק
            לאירוע הזה בלבד, כולל התאמות, הערות, רגישויות וניהול לייב של כמויות.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onChooseMenu}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <Plus size={17} />
              בחר תפריט מתוך תפריטי האולם
            </button>

            <Link
              href={
                hallId
                  ? `/venues/dashboard/halls/${hallId}/menus`
                  : "/venues/dashboard"
              }
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white px-6 text-sm font-black text-[#9f6f1a] transition hover:bg-[#fff8eb]"
            >
              <Utensils size={17} />
              ניהול תפריטי אולם
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[#2b241c]">
              תפריטים פעילים של האולם
            </h3>
            <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#b98121]">
              {menusLoading ? "טוען..." : `${templates.length} תפריטים`}
            </span>
          </div>

          {templates.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4"
                >
                  <div className="text-lg font-black text-[#2b241c]">
                    {template.name}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">
                    {template.description || "תפריט אולם מעודכן"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <InfoPill label="קטגוריות" value={`${template.categories}`} />
                    <InfoPill label="מנות" value={`${template.dishes}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBox text="לא נמצאו תפריטים פעילים לאולם הזה." />
          )}
        </div>
      </MainCard>
    );
  }

  if (menuView === "live") {
    return (
      <>
        {menuError && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {menuError}
          </div>
        )}

        <MainCard title="ניהול לייב באירוע" icon={<Sparkles size={19} />}>
          <div className="rounded-[30px] border border-[#eadfce] bg-gradient-to-br from-[#fffaf0] via-white to-[#f7ead6] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-black text-[#b98121]">
                  דוח מטבח בזמן אמת · לפי קטגוריות ומנות שנבחרו
                </div>
                <h3 className="mt-1 text-2xl font-black text-[#2b241c]">
                  סימון כמויות לפי קטגוריה או לפי תת־מנה
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#7f705d]">
                  קודם רואים את הקטגוריות שבעל האירוע בחר מתוכן. לחיצה על החץ פותחת את כל המנות שנבחרו תחת אותה קטגוריה. אפשר לעדכן כמות כללית לקטגוריה או כמות מדויקת למנה מסוימת; עדכון תת־מנה נספר אוטומטית בסיכום הקטגוריה.
                </p>
              </div>

              <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[560px]">
                <div className="rounded-2xl border border-[#eadfce] bg-white p-4 text-center">
                  <div className="text-xs font-black text-[#8a7b68]">כמות מוערכת</div>
                  <div className="mt-1 text-2xl font-black text-[#2b241c]">{totalEstimated}</div>
                </div>
                <div className="rounded-2xl border border-[#d9bd83] bg-[#fff8eb] p-4 text-center">
                  <div className="text-xs font-black text-[#8a7b68]">כמות בפועל</div>
                  <div className="mt-1 text-2xl font-black text-[#b98121]">{totalActual}</div>
                </div>
                <div className="rounded-2xl border border-[#eadfce] bg-white p-4 text-center">
                  <div className="text-xs font-black text-[#8a7b68]">פער</div>
                  <div
                    className={[
                      "mt-1 text-2xl font-black",
                      totalActual - totalEstimated > 0
                        ? "text-emerald-700"
                        : totalActual - totalEstimated < 0
                          ? "text-rose-700"
                          : "text-[#2b241c]",
                    ].join(" ")}
                  >
                    {totalActual - totalEstimated > 0 ? "+" : ""}
                    {totalActual - totalEstimated}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black",
                    kitchenReportStatus === "submitted"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  ].join(" ")}
                >
                  {kitchenReportStatus === "submitted" ? "דוח נסגר" : "טיוטה פעילה"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8a7b68]">
                  {menuSaving ? "שומר..." : "נשמר אחרי כל שינוי"}
                </span>
                {assignedMenu.kitchenReportUpdatedAt ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8a7b68]">
                    עודכן: {formatDateTime(assignedMenu.kitchenReportUpdatedAt)}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMenuView("overview")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 text-sm font-black text-[#6f6252]"
              >
                <ArrowRight size={16} />
                חזרה לתפריט האירוע
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {categoryGroups.length ? (
              categoryGroups.map((group) => {
                const isOpen = expandedCategories[group.key] !== false;
                const diff = group.actualTotal - group.plannedTotal;

                return (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-sm"
                  >
                    <div className="grid gap-3 border-b border-[#eadfce] bg-[#fff8eb] p-4 xl:grid-cols-[1.4fr_170px_170px_210px_90px_44px] xl:items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategories((current) => ({
                            ...current,
                            [group.key]: !isOpen,
                          }))
                        }
                        className="flex items-center gap-3 text-right"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#b98121]">
                          {isOpen ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
                        </span>
                        <span>
                          <span className="block text-lg font-black text-[#2b241c]">
                            {group.categoryTitle}
                          </span>
                          <span className="mt-1 block text-xs font-bold text-[#8a7b68]">
                            {group.rows.length} מנות תחת הקטגוריה · אפשר לסמן כאן כללי או לפתוח לתת־מנות
                          </span>
                        </span>
                      </button>

                      <label className="block">
                        <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                          כמות מוערכת בקטגוריה
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={group.plannedTotal}
                          onChange={(event) =>
                            setCategoryTotal(group, "plannedQuantity", event.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-center text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                          כמות בפועל בקטגוריה
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={group.actualTotal}
                          onChange={(event) =>
                            setCategoryTotal(group, "actualServedQuantity", event.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-[#d9bd83] bg-white px-3 text-center text-lg font-black text-[#b98121] outline-none focus:border-[#b98121]"
                        />
                      </label>

                      <div>
                        <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                          עדכון מהיר לקטגוריה
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => quickUpdateCategoryActual(group, -1)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-lg font-black text-[#6f6252]"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => quickUpdateCategoryActual(group, 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#b98121] text-lg font-black text-white"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => quickUpdateCategoryActual(group, 10)}
                            className="h-10 rounded-2xl border border-[#d9bd83] bg-white px-3 text-xs font-black text-[#9f6f1a]"
                          >
                            +10
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                          פער
                        </span>
                        <span
                          className={[
                            "inline-flex h-10 items-center rounded-full px-3 text-xs font-black",
                            diff > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : diff < 0
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addKitchenDish(group)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d9bd83] bg-white text-[#9f6f1a]"
                        title="הוספת מנה ידנית לקטגוריה"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="divide-y divide-[#f0e6d8]">
                        {group.rows.map((row) => {
                          const rowDiff =
                            normalizeQuantity(row.actualServedQuantity) -
                            normalizeQuantity(row.plannedQuantity);
                          const isCategoryGeneral = row.dishId === CATEGORY_GENERAL_DISH_ID;

                          return (
                            <div
                              key={row.id}
                              className="grid gap-3 p-4 xl:grid-cols-[1.4fr_140px_140px_200px_90px_1.1fr_44px] xl:items-center"
                            >
                              <div>
                                <div className="mb-1 text-[11px] font-black text-[#8a7b68]">
                                  {isCategoryGeneral ? "סימון לפי קטגוריה" : "תת־מנה"}
                                </div>
                                <input
                                  value={row.dishName}
                                  disabled={isCategoryGeneral}
                                  onChange={(event) =>
                                    updateKitchenDish(row.id, "dishName", event.target.value, false)
                                  }
                                  onBlur={(event) =>
                                    updateKitchenDish(row.id, "dishName", event.target.value, true)
                                  }
                                  placeholder="שם מנה"
                                  className={[
                                    "h-11 w-full rounded-2xl border border-[#eadfce] px-3 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]",
                                    isCategoryGeneral ? "bg-[#fff8eb]" : "bg-[#fffdf8]",
                                  ].join(" ")}
                                />
                              </div>

                              <label className="block">
                                <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                                  כמות מוערכת
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={row.plannedQuantity}
                                  onChange={(event) =>
                                    updateKitchenDish(row.id, "plannedQuantity", event.target.value)
                                  }
                                  className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-center text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                                  כמות בפועל
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={row.actualServedQuantity}
                                  onChange={(event) =>
                                    updateKitchenDish(row.id, "actualServedQuantity", event.target.value)
                                  }
                                  className="h-11 w-full rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-3 text-center text-lg font-black text-[#b98121] outline-none focus:border-[#b98121]"
                                />
                              </label>

                              <div>
                                <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                                  עדכון מהיר
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => quickUpdateActualServed(row.id, -1)}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-lg font-black text-[#6f6252]"
                                  >
                                    −
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => quickUpdateActualServed(row.id, 1)}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#b98121] text-lg font-black text-white"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => quickUpdateActualServed(row.id, 10)}
                                    className="h-10 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-3 text-xs font-black text-[#9f6f1a]"
                                  >
                                    +10
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                                  פער
                                </span>
                                <span
                                  className={[
                                    "inline-flex h-10 items-center rounded-full px-3 text-xs font-black",
                                    rowDiff > 0
                                      ? "bg-emerald-50 text-emerald-700"
                                      : rowDiff < 0
                                        ? "bg-rose-50 text-rose-700"
                                        : "bg-slate-100 text-slate-600",
                                  ].join(" ")}
                                >
                                  {rowDiff > 0 ? "+" : ""}
                                  {rowDiff}
                                </span>
                              </div>

                              <label className="block">
                                <span className="mb-1 block text-[11px] font-black text-[#8a7b68]">
                                  הערות
                                </span>
                                <input
                                  value={row.notes}
                                  onChange={(event) =>
                                    updateKitchenDish(row.id, "notes", event.target.value, false)
                                  }
                                  onBlur={(event) =>
                                    updateKitchenDish(row.id, "notes", event.target.value, true)
                                  }
                                  placeholder="לדוגמה: יצאו עוד 5 בגלל בקשות במקום"
                                  className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => removeKitchenDish(row.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyBox text="אין עדיין מנות לניהול לייב. אפשר להוסיף מנה ידנית." />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => addKitchenDish()}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-5 text-sm font-black text-[#9f6f1a]"
            >
              <Plus size={16} />
              הוספת מנה ידנית ללייב
            </button>

            <button
              type="button"
              disabled={menuSaving}
              onClick={markKitchenReportSubmitted}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              סגירת דוח לייב
            </button>
          </div>
        </MainCard>

        <MainCard title="רגישויות / כשרויות / מנות מיוחדות" icon={<ShieldCheck size={19} />}>
          <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-xl font-black text-[#2b241c]">
                  הערות מיוחדות למטבח
                </h3>
                <p className="mt-1 text-sm font-bold leading-7 text-[#7f705d]">
                  גם כאן כל שינוי נשמר אחרי שינוי אמיתי: רגישויות, כשרויות, טבעוני/צמחוני וכל דרישה מיוחדת.
                </p>
              </div>
              <InfoPill label="סה״כ מנות מיוחדות" value={`${totalSpecial}`} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {([
                "allergy",
                "kosher",
                "vegetarian",
                "vegan",
                "gluten_free",
                "kids",
                "other",
              ] as KitchenSpecialNoteType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addSpecialNote(type)}
                  className="rounded-full border border-[#d9bd83] bg-white px-4 py-2 text-xs font-black text-[#9f6f1a] transition hover:bg-[#fff8eb]"
                >
                  + {kitchenSpecialTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {kitchenSpecialNotes.length ? (
              kitchenSpecialNotes.map((row) => (
                <div key={row.id} className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <div className="grid gap-3 lg:grid-cols-[190px_1fr_120px_1.4fr_44px] lg:items-end">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black text-[#8a7b68]">סוג</span>
                      <select
                        value={row.type}
                        onChange={(event) => updateSpecialNote(row.id, "type", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
                      >
                        <option value="allergy">אלרגיה / רגישות</option>
                        <option value="kosher">כשרות</option>
                        <option value="vegetarian">צמחוני</option>
                        <option value="vegan">טבעוני</option>
                        <option value="gluten_free">ללא גלוטן</option>
                        <option value="kids">ילדים</option>
                        <option value="other">אחר</option>
                      </select>
                    </label>

                    <InputEdit
                      label="כותרת"
                      value={row.title}
                      onChange={(value) => updateSpecialNote(row.id, "title", value, false)}
                      onBlur={(value) => updateSpecialNote(row.id, "title", value, true)}
                      placeholder="לדוגמה: אלרגיה לאגוזים"
                    />

                    <InputEdit
                      label="כמות"
                      type="number"
                      value={String(row.quantity)}
                      onChange={(value) => updateSpecialNote(row.id, "quantity", value)}
                    />

                    <InputEdit
                      label="הערה למטבח"
                      value={row.notes}
                      onChange={(value) => updateSpecialNote(row.id, "notes", value, false)}
                      onBlur={(value) => updateSpecialNote(row.id, "notes", value, true)}
                      placeholder="לדוגמה: להכין בנפרד, לא לערבב עם גלוטן"
                    />

                    <button
                      type="button"
                      onClick={() => removeSpecialNote(row.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="אין עדיין רגישויות, כשרויות או מנות מיוחדות. אפשר להוסיף לפי צורך." />
            )}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black text-[#8a7b68]">
              הערה כללית למטבח
            </span>
            <textarea
              value={kitchenGeneralNotes}
              onChange={(event) => {
                setKitchenReportStatus("draft");
                setKitchenGeneralNotes(event.target.value);
              }}
              onBlur={(event) => saveGeneralNotes(event.target.value)}
              placeholder="לדוגמה: לפתוח טבעוני ראשון, לשים לב למנות ילדים בשולחנות 3 ו-8"
              className="min-h-[110px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />
          </label>
        </MainCard>
      </>
    );
  }

  return (
    <>
      {menuError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
          {menuError}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <MainCard title="תפריט משויך לאירוע" icon={<Utensils size={19} />}>
          <div className="rounded-[28px] border border-[#eadfce] bg-gradient-to-br from-[#fffaf0] via-white to-[#f8eddb] p-5 shadow-sm">
            <div className="text-xs font-black text-[#b98121]">
              עותק תפריט לאירוע
            </div>
            <h2 className="mt-1 text-2xl font-black text-[#2b241c]">
              {assignedMenu.name}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
              כאן מנהלים את התפריט שנשלח לבעל האירוע. ניהול כמויות בזמן אמת עבר למסך נפרד ומסודר.
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black text-[#8a7b68]">
                הערה לאירוע הספציפי הזה
              </span>
              <textarea
                value={assignedMenu.eventNote || ""}
                onChange={(event) => onUpdateEventNote(event.target.value)}
                placeholder="לדוגמה: לזוג הזה לאפשר 2 עיקריות במקום 1 / לא להציג מנה מסוימת / הערת אלרגנים"
                className="min-h-[92px] w-full rounded-2xl border border-[#eadfce] bg-white p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              />
            </label>
          </div>

          <MenuEditPolicyBox
            selectionEditMode={assignedMenu.selectionEditMode || "untilDate"}
            selectionEditableUntil={assignedMenu.selectionEditableUntil || ""}
            lockedAt={assignedMenu.lockedAt || null}
            lockedReason={assignedMenu.lockedReason || ""}
            onChangeMode={(value) =>
              onUpdateSelectionPolicy({ selectionEditMode: value })
            }
            onChangeEditableUntil={(value) =>
              onUpdateSelectionPolicy({ selectionEditableUntil: value })
            }
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMenuView("live")}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1f1b17] text-sm font-black text-white shadow-sm transition hover:bg-black"
            >
              <Sparkles size={16} />
              ניהול לייב באירוע
            </button>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
            >
              <Send size={16} />
              שליחת SMS לבחירת מנות
            </button>
          </div>

          <button
            type="button"
            disabled={menuSaving}
            onClick={onSaveChanges}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252] disabled:opacity-60"
          >
            <Save size={16} />
            {menuSaving ? "שומר..." : "שמירת התאמות תפריט"}
          </button>
        </MainCard>

        <MainCard title="קישור אישי" icon={<Link2 size={19} />}>
          <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
            <div className="text-xs font-black text-[#8a7b68]">
              קישור אישי לבחירת מנות
            </div>
            <div className="mt-2 break-all text-sm font-black leading-6 text-[#2b241c]">
              {publicLink}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={assignedMenu.publicLink || `/menus/choose/${assignedMenu.publicToken || eventId}`}
              target="_blank"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
            >
              <Eye size={16} />
              פתיחת תצוגה
            </Link>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicLink);
                  alert("הקישור הועתק");
                } catch {
                  alert("לא הצלחתי להעתיק אוטומטית");
                }
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
            >
              <Link2 size={16} />
              העתקת קישור
            </button>
          </div>
        </MainCard>

        <MainCard title="סטטוס תפריט" icon={<CheckCircle2 size={19} />}>
          <div className="space-y-3">
            <StatusLine label="תפריט נבחר" done />
            <StatusLine label="קישור נשלח" done={assignedMenu.sentToCouple} />
            <StatusLine label="בחירת מנות הושלמה" done={assignedMenu.coupleSelected} />
            <StatusLine label="ניהול לייב פעיל" done={kitchenDishes.length > 0} />
          </div>
        </MainCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <MainCard title="בחירות בעל האירוע" icon={<CheckCircle2 size={19} />}>
          {(assignedMenu.selectedDishes || []).length ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-base font-black text-emerald-800">
                  בעל האירוע שמר בחירת מנות
                </div>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  <InfoPill label="שם ממלא" value={assignedMenu.submittedByName || "לא הוזן"} />
                  <InfoPill label="טלפון" value={assignedMenu.submittedByPhone || "לא הוזן"} />
                  <InfoPill
                    label="נשמר בתאריך"
                    value={assignedMenu.submittedAt ? formatDateTime(assignedMenu.submittedAt) : "לא הוגדר"}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedDishGroups).map(([categoryTitle, dishes]) => (
                  <div
                    key={categoryTitle}
                    className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4"
                  >
                    <div className="mb-3 text-sm font-black text-[#2b241c]">
                      {categoryTitle}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dishes.map((dish) => (
                        <span
                          key={`${dish.categoryId}-${dish.dishId}`}
                          className="rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#8c5f19]"
                        >
                          {dish.dishName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {assignedMenu.customerNote ? (
                <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                  <div className="text-xs font-black text-[#8a7b68]">
                    הערות בעל האירוע
                  </div>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#2b241c]">
                    {assignedMenu.customerNote}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5">
              <div className="text-base font-black text-[#2b241c]">
                עדיין לא נבחרו מנות
              </div>
              <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                אחרי שבעל האירוע יפתח את הקישור האישי וישמור בחירה, המנות יופיעו כאן אוטומטית.
              </p>
            </div>
          )}
        </MainCard>

        <MainCard title="התאמות בחירה לאירוע הזה" icon={<Edit3 size={19} />}>
          <div className="rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
            כאן האולם משנה את כמות הבחירות רק עבור האירוע הזה. ניהול לייב נמצא בכפתור נפרד למעלה.
          </div>

          <div className="mt-4 space-y-3">
            {assignedMenu.categoryOverrides.length ? (
              assignedMenu.categoryOverrides.map((category) => (
                <div key={category.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-base font-black text-[#2b241c]">
                        {category.name}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                        במקור: בחירה {category.originalMaxChoices} מתוך {category.dishesCount || "המוגדרות"}
                      </div>
                    </div>

                    <div className="w-full sm:w-[220px]">
                      <InputEdit
                        label="כמה לבחירה"
                        type="number"
                        value={String(category.eventMaxChoices)}
                        onChange={(value) => onUpdateCategory(category.id, "eventChoices", value)}
                      />
                    </div>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                      הערה לקטגוריה באירוע הזה
                    </span>
                    <input
                      value={category.eventNote}
                      onChange={(event) => onUpdateCategory(category.id, "eventNote", event.target.value)}
                      placeholder="הערה שתישמר רק לאירוע הזה"
                      className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                    />
                  </label>
                </div>
              ))
            ) : (
              <EmptyBox text="לתפריט הזה אין קטגוריות עם חוקי בחירה." />
            )}
          </div>
        </MainCard>
      </section>
    </>
  );
}

function MenuEditPolicyBox({
  selectionEditMode,
  selectionEditableUntil,
  lockedAt,
  lockedReason,
  onChangeMode,
  onChangeEditableUntil,
}: {
  selectionEditMode: SelectionEditMode;
  selectionEditableUntil?: string | null;
  lockedAt?: string | null;
  lockedReason?: string;
  onChangeMode: (value: SelectionEditMode) => void;
  onChangeEditableUntil: (value: string) => void;
}) {
  const isUntilDate = selectionEditMode === "untilDate";

  return (
    <div className="mt-4 rounded-[24px] border border-[#eadfce] bg-white p-4">
      <div className="text-sm font-black text-[#2b241c]">
        אפשרות עריכה לבעל האירוע
      </div>
      <p className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
        ההגבלה הזאת חלה רק על בעל האירוע בקישור האישי. האולם יכול לערוך ולעדכן תמיד מתוך הדשבורד.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChangeMode("untilDate")}
          className={[
            "rounded-2xl border p-4 text-right transition",
            isUntilDate
              ? "border-[#b98121] bg-[#fff8eb] text-[#8c5f19]"
              : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fff8eb]",
          ].join(" ")}
        >
          <div className="text-sm font-black">ניתן לעדכן עד תאריך</div>
          <div className="mt-1 text-xs font-bold leading-5">
            אחרי התאריך שהאולם הגדיר, בעל האירוע יראה את התפריט לצפייה בלבד.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode("lockAfterSubmit")}
          className={[
            "rounded-2xl border p-4 text-right transition",
            !isUntilDate
              ? "border-[#b98121] bg-[#fff8eb] text-[#8c5f19]"
              : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fff8eb]",
          ].join(" ")}
        >
          <div className="text-sm font-black">ננעל לאחר בחירה ראשונה</div>
          <div className="mt-1 text-xs font-bold leading-5">
            אחרי שבעל האירוע שומר פעם אחת, הוא יוכל לראות את התפריט בלבד.
          </div>
        </button>
      </div>

      {isUntilDate ? (
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-black text-[#8a7b68]">
            ניתן לעדכן עד תאריך ושעה
          </span>
          <input
            type="datetime-local"
            value={formatDateTimeInputValue(selectionEditableUntil)}
            onChange={(event) => onChangeEditableUntil(event.target.value)}
            className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
          />
        </label>
      ) : null}

      {lockedAt ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-black leading-5 text-amber-700">
          התפריט נעול לבעל האירוע לצפייה בלבד.
          {lockedReason ? ` סיבה: ${lockedReason}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function StatusLine({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-3">
      <span className="text-sm font-black text-[#2b241c]">{label}</span>
      <span
        className={[
          "rounded-full px-3 py-1 text-xs font-black",
          done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {done ? "בוצע" : "ממתין"}
      </span>
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

function MainCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InputEdit({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onBlur?.(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-4 text-center text-sm font-bold leading-6 text-[#7f705d]">
      {text}
    </div>
  );
}
