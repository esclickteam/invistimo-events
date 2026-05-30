"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Edit3,
  Eye,
  Layers3,
  Link2,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
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

type LiveCategory = {
  id: string;
  title: string;
  subtitle: string;
  directSummary: KitchenReportDish;
  dishes: KitchenReportDish[];
};

type SaveKitchenPayload = Pick<
  AssignedMenu,
  | "kitchenReportStatus"
  | "kitchenGeneralNotes"
  | "kitchenDishes"
  | "kitchenSpecialNotes"
>;

const CATEGORY_SUMMARY_DISH_ID = "__category_summary__";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: unknown) {
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

function kitchenSpecialTypeLabel(type: KitchenSpecialNoteType) {
  if (type === "allergy") return "אלרגיה / רגישות";
  if (type === "kosher") return "כשרות";
  if (type === "vegetarian") return "צמחוני";
  if (type === "vegan") return "טבעוני";
  if (type === "gluten_free") return "ללא גלוטן";
  if (type === "kids") return "ילדים";
  return "אחר";
}

function normalizeKitchenDishes(raw: any): KitchenReportDish[] {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => ({
    id: String(item?.id || item?._id || item?.dishId || `kitchen-dish-${index + 1}`),
    dishId: item?.dishId ? String(item.dishId) : "",
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    categoryTitle: String(item?.categoryTitle || item?.categoryName || "כללי"),
    dishName: String(item?.dishName || item?.name || "מנה ללא שם"),
    plannedQuantity: clampNumber(item?.plannedQuantity),
    actualServedQuantity: clampNumber(item?.actualServedQuantity),
    notes: String(item?.notes || ""),
  }));
}

function normalizeKitchenSpecialNotes(raw: any): KitchenSpecialNote[] {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => {
    const type = String(item?.type || "other");
    const validType: KitchenSpecialNoteType = [
      "allergy",
      "kosher",
      "vegetarian",
      "vegan",
      "gluten_free",
      "kids",
      "other",
    ].includes(type)
      ? (type as KitchenSpecialNoteType)
      : "other";

    return {
      id: String(item?.id || item?._id || `special-note-${index + 1}`),
      type: validType,
      title: String(item?.title || ""),
      quantity: clampNumber(item?.quantity),
      notes: String(item?.notes || ""),
    };
  });
}

function isCategorySummaryRow(row: KitchenReportDish) {
  return row.dishId === CATEGORY_SUMMARY_DISH_ID || row.id.startsWith("category-summary:");
}

function categorySummaryId(categoryId: string) {
  return `category-summary:${categoryId || "general"}`;
}

function makeCategorySummaryRow(categoryId: string, categoryTitle: string): KitchenReportDish {
  return {
    id: categorySummaryId(categoryId),
    dishId: CATEGORY_SUMMARY_DISH_ID,
    categoryId,
    categoryTitle,
    dishName: categoryTitle,
    plannedQuantity: 0,
    actualServedQuantity: 0,
    notes: "",
  };
}

function selectedSignature(menu: AssignedMenu | null) {
  const selected = Array.isArray(menu?.selectedDishes) ? menu?.selectedDishes || [] : [];
  return selected
    .map((dish) => `${dish.categoryId}|${dish.dishId}|${dish.categoryTitle}|${dish.dishName}`)
    .join(";;");
}

function buildKitchenDishesFromSelectedMenu(menu: AssignedMenu | null): KitchenReportDish[] {
  if (!menu) return [];

  const existingRows = normalizeKitchenDishes(menu.kitchenDishes);
  const existingByKey = new Map<string, KitchenReportDish>();

  existingRows.forEach((row) => {
    const key = `${row.categoryId || ""}|${row.dishId || ""}`;
    existingByKey.set(key, row);
  });

  const selectedDishes = Array.isArray(menu.selectedDishes) ? menu.selectedDishes : [];
  const selectedRows: KitchenReportDish[] = [];
  const categoryMap = new Map<string, string>();

  selectedDishes.forEach((dish, index) => {
    const categoryId = String(dish.categoryId || "general");
    const categoryTitle = String(dish.categoryTitle || "כללי");
    const dishId = String(dish.dishId || `selected-${index + 1}`);
    const key = `${categoryId}|${dishId}`;
    const existing = existingByKey.get(key);

    categoryMap.set(categoryId, categoryTitle);

    selectedRows.push({
      id: existing?.id || `${categoryId}-${dishId}`,
      dishId,
      categoryId,
      categoryTitle,
      dishName: dish.dishName || existing?.dishName || "מנה ללא שם",
      plannedQuantity: existing?.plannedQuantity || 0,
      actualServedQuantity: existing?.actualServedQuantity || 0,
      notes: existing?.notes || "",
    });
  });

  if (selectedRows.length) {
    const summaryRows = Array.from(categoryMap.entries()).map(([categoryId, title]) => {
      const existing = existingByKey.get(`${categoryId}|${CATEGORY_SUMMARY_DISH_ID}`);
      return existing || makeCategorySummaryRow(categoryId, title);
    });

    return [...summaryRows, ...selectedRows];
  }

  const nonSummaryExisting = existingRows.filter((row) => !isCategorySummaryRow(row));
  if (nonSummaryExisting.length) return existingRows;

  return menu.categoryOverrides.flatMap((category, index) => {
    const categoryId = category.id || `category-${index + 1}`;
    const categoryTitle = category.name || `קטגוריה ${index + 1}`;
    return [makeCategorySummaryRow(categoryId, categoryTitle)];
  });
}

function groupKitchenRows(rows: KitchenReportDish[]): LiveCategory[] {
  const groups = new Map<string, LiveCategory>();

  rows.forEach((row) => {
    const categoryId = row.categoryId || "general";
    const categoryTitle = row.categoryTitle || "כללי";

    if (!groups.has(categoryId)) {
      groups.set(categoryId, {
        id: categoryId,
        title: categoryTitle,
        subtitle: "",
        directSummary: makeCategorySummaryRow(categoryId, categoryTitle),
        dishes: [],
      });
    }

    const group = groups.get(categoryId)!;

    if (isCategorySummaryRow(row)) {
      group.directSummary = {
        ...row,
        dishId: CATEGORY_SUMMARY_DISH_ID,
        dishName: categoryTitle,
        categoryTitle,
      };
    } else {
      group.dishes.push(row);
    }
  });

  return Array.from(groups.values()).map((group) => {
    const plannedChildren = group.dishes.reduce(
      (sum, row) => sum + clampNumber(row.plannedQuantity),
      0
    );
    const actualChildren = group.dishes.reduce(
      (sum, row) => sum + clampNumber(row.actualServedQuantity),
      0
    );

    return {
      ...group,
      subtitle: group.dishes.length
        ? `${group.dishes.length} מנות תחת הקטגוריה · אפשר לעדכן כל מנה בנפרד או לפתוח/לסגור את הרשימה`
        : "אין מנות שנבחרו תחת הקטגוריה · אפשר לסמן כמות כללית לקטגוריה",
      directSummary: {
        ...group.directSummary,
        plannedQuantity: plannedChildren > 0 ? plannedChildren : group.directSummary.plannedQuantity,
        actualServedQuantity: actualChildren > 0 ? actualChildren : group.directSummary.actualServedQuantity,
      },
    };
  });
}

function totalsFromGroups(groups: LiveCategory[]) {
  return groups.reduce(
    (acc, group) => {
      acc.estimated += clampNumber(group.directSummary.plannedQuantity);
      acc.actual += clampNumber(group.directSummary.actualServedQuantity);
      return acc;
    },
    { estimated: 0, actual: 0 }
  );
}

function payloadRowsFromGroups(groups: LiveCategory[]) {
  return groups.flatMap((group) => {
    const childrenHaveValues = group.dishes.some(
      (row) => clampNumber(row.plannedQuantity) > 0 || clampNumber(row.actualServedQuantity) > 0
    );

    const summaryRow: KitchenReportDish = {
      ...group.directSummary,
      id: categorySummaryId(group.id),
      dishId: CATEGORY_SUMMARY_DISH_ID,
      categoryId: group.id,
      categoryTitle: group.title,
      dishName: group.title,
      plannedQuantity: childrenHaveValues
        ? group.dishes.reduce((sum, row) => sum + clampNumber(row.plannedQuantity), 0)
        : clampNumber(group.directSummary.plannedQuantity),
      actualServedQuantity: childrenHaveValues
        ? group.dishes.reduce((sum, row) => sum + clampNumber(row.actualServedQuantity), 0)
        : clampNumber(group.directSummary.actualServedQuantity),
    };

    return [summaryRow, ...group.dishes];
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
}: {
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
  onSaveKitchenReport: (payload: SaveKitchenPayload) => void | Promise<void>;
}) {
  const [menuView, setMenuView] = useState<"overview" | "live">(() => {
    if (typeof window === "undefined") return "overview";
    const saved = sessionStorage.getItem(`event-menu-view-${eventId}`);
    return saved === "live" || saved === "overview" ? saved : "overview";
  });

  const [liveSaving, setLiveSaving] = useState(false);
  const savingRef = useRef(false);
  const pendingPayloadRef = useRef<SaveKitchenPayload | null>(null);

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [liveGroups, setLiveGroups] = useState<LiveCategory[]>(() =>
    groupKitchenRows(buildKitchenDishesFromSelectedMenu(assignedMenu))
  );

  const [kitchenSpecialNotes, setKitchenSpecialNotes] = useState<KitchenSpecialNote[]>(
    normalizeKitchenSpecialNotes(assignedMenu?.kitchenSpecialNotes)
  );
  const [kitchenGeneralNotes, setKitchenGeneralNotes] = useState(
    assignedMenu?.kitchenGeneralNotes || ""
  );
  const [kitchenReportStatus, setKitchenReportStatus] = useState<KitchenReportStatus>(
    assignedMenu?.kitchenReportStatus || "draft"
  );

  const selectedDishKey = useMemo(() => selectedSignature(assignedMenu), [assignedMenu]);

  useEffect(() => {
    if (!eventId || typeof window === "undefined") return;
    sessionStorage.setItem(`event-menu-view-${eventId}`, menuView);
  }, [eventId, menuView]);

  useEffect(() => {
    const nextGroups = groupKitchenRows(buildKitchenDishesFromSelectedMenu(assignedMenu));
    setLiveGroups(nextGroups);
    setKitchenSpecialNotes(normalizeKitchenSpecialNotes(assignedMenu?.kitchenSpecialNotes));
    setKitchenGeneralNotes(assignedMenu?.kitchenGeneralNotes || "");
    setKitchenReportStatus(assignedMenu?.kitchenReportStatus || "draft");

    setOpenCategories((current) => {
      const next: Record<string, boolean> = {};
      nextGroups.forEach((group) => {
        next[group.id] = current[group.id] ?? true;
      });
      return next;
    });
  }, [assignedMenu?.id, selectedDishKey]);

  const publicLink =
    assignedMenu?.publicLink ||
    `https://www.invistimo.com/menus/choose/${assignedMenu?.publicToken || eventId}`;

  const selectedDishGroups = useMemo(() => {
    return (assignedMenu?.selectedDishes || []).reduce(
      (groups, item) => {
        const key = item.categoryTitle || "קטגוריה";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
      },
      {} as Record<string, NonNullable<AssignedMenu["selectedDishes"]>>
    );
  }, [assignedMenu?.selectedDishes]);

  const totalSpecial = kitchenSpecialNotes.reduce(
    (sum, item) => sum + clampNumber(item.quantity),
    0
  );

  const totals = useMemo(() => totalsFromGroups(liveGroups), [liveGroups]);
  const totalGap = totals.actual - totals.estimated;

  const currentKitchenPayload = (
    patch?: Partial<SaveKitchenPayload>,
    groupsOverride?: LiveCategory[]
  ): SaveKitchenPayload => ({
    kitchenReportStatus: patch?.kitchenReportStatus || kitchenReportStatus || "draft",
    kitchenGeneralNotes:
      patch?.kitchenGeneralNotes !== undefined
        ? patch.kitchenGeneralNotes
        : kitchenGeneralNotes,
    kitchenDishes:
      patch?.kitchenDishes || payloadRowsFromGroups(groupsOverride || liveGroups),
    kitchenSpecialNotes:
      patch?.kitchenSpecialNotes !== undefined
        ? patch.kitchenSpecialNotes
        : kitchenSpecialNotes,
  });

  const saveLiveNow = async (payload: SaveKitchenPayload) => {
    if (!assignedMenu) return;

    if (savingRef.current) {
      pendingPayloadRef.current = payload;
      return;
    }

    savingRef.current = true;
    setLiveSaving(true);

    try {
      await Promise.resolve(onSaveKitchenReport(payload));
    } finally {
      savingRef.current = false;
      setLiveSaving(false);

      const pending = pendingPayloadRef.current;
      pendingPayloadRef.current = null;

      if (pending) {
        await saveLiveNow(pending);
      }
    }
  };

  const updateLiveGroupsAndSave = (
    updater: (current: LiveCategory[]) => LiveCategory[],
    patch?: Partial<SaveKitchenPayload>
  ) => {
    setKitchenReportStatus("draft");

    setLiveGroups((current) => {
      const nextGroups = updater(current);
      const payload = currentKitchenPayload(
        { kitchenReportStatus: "draft", ...patch },
        nextGroups
      );
      void saveLiveNow(payload);
      return nextGroups;
    });
  };

  const updateCategoryQuantity = (
    categoryId: string,
    field: "plannedQuantity" | "actualServedQuantity",
    value: string | number
  ) => {
    updateLiveGroupsAndSave((current) =>
      current.map((group) => {
        if (group.id !== categoryId) return group;

        return {
          ...group,
          directSummary: {
            ...group.directSummary,
            [field]: clampNumber(value),
          },
          dishes: group.dishes.map((dish) => ({
            ...dish,
            [field]: 0,
          })),
        };
      })
    );
  };

  const quickUpdateCategoryActual = (categoryId: string, diff: number) => {
    updateLiveGroupsAndSave((current) =>
      current.map((group) => {
        if (group.id !== categoryId) return group;

        return {
          ...group,
          directSummary: {
            ...group.directSummary,
            actualServedQuantity: clampNumber(group.directSummary.actualServedQuantity + diff),
          },
          dishes: group.dishes.map((dish) => ({ ...dish, actualServedQuantity: 0 })),
        };
      })
    );
  };

  const updateDishRow = (
    categoryId: string,
    rowId: string,
    field: keyof Pick<KitchenReportDish, "plannedQuantity" | "actualServedQuantity" | "notes" | "dishName">,
    value: string | number
  ) => {
    updateLiveGroupsAndSave((current) =>
      current.map((group) => {
        if (group.id !== categoryId) return group;

        const nextDishes = group.dishes.map((row) => {
          if (row.id !== rowId) return row;

          if (field === "notes" || field === "dishName") {
            return { ...row, [field]: String(value) };
          }

          return { ...row, [field]: clampNumber(value) };
        });

        const planned = nextDishes.reduce((sum, row) => sum + clampNumber(row.plannedQuantity), 0);
        const actual = nextDishes.reduce((sum, row) => sum + clampNumber(row.actualServedQuantity), 0);

        return {
          ...group,
          directSummary: {
            ...group.directSummary,
            plannedQuantity: planned,
            actualServedQuantity: actual,
          },
          dishes: nextDishes,
        };
      })
    );
  };

  const quickUpdateDishActual = (categoryId: string, rowId: string, diff: number) => {
    updateLiveGroupsAndSave((current) =>
      current.map((group) => {
        if (group.id !== categoryId) return group;

        const nextDishes = group.dishes.map((row) =>
          row.id === rowId
            ? {
                ...row,
                actualServedQuantity: clampNumber(row.actualServedQuantity + diff),
              }
            : row
        );

        return {
          ...group,
          directSummary: {
            ...group.directSummary,
            actualServedQuantity: nextDishes.reduce(
              (sum, row) => sum + clampNumber(row.actualServedQuantity),
              0
            ),
            plannedQuantity: nextDishes.reduce(
              (sum, row) => sum + clampNumber(row.plannedQuantity),
              0
            ),
          },
          dishes: nextDishes,
        };
      })
    );
  };

  const addManualDishToCategory = (categoryId: string) => {
    updateLiveGroupsAndSave((current) =>
      current.map((group) => {
        if (group.id !== categoryId) return group;

        return {
          ...group,
          dishes: [
            ...group.dishes,
            {
              id: `manual-dish-${Date.now()}`,
              dishId: `manual-${Date.now()}`,
              categoryId: group.id,
              categoryTitle: group.title,
              dishName: "",
              plannedQuantity: 0,
              actualServedQuantity: 0,
              notes: "",
            },
          ],
        };
      })
    );
  };

  const removeDishFromCategory = (categoryId: string, rowId: string) => {
    updateLiveGroupsAndSave((current) =>
      current.map((group) => {
        if (group.id !== categoryId) return group;

        const nextDishes = group.dishes.filter((row) => row.id !== rowId);
        return {
          ...group,
          directSummary: {
            ...group.directSummary,
            plannedQuantity: nextDishes.reduce((sum, row) => sum + clampNumber(row.plannedQuantity), 0),
            actualServedQuantity: nextDishes.reduce(
              (sum, row) => sum + clampNumber(row.actualServedQuantity),
              0
            ),
          },
          dishes: nextDishes,
        };
      })
    );
  };

  const addSpecialNote = (type: KitchenSpecialNoteType) => {
    const nextSpecialNotes = [
      ...kitchenSpecialNotes,
      {
        id: `special-${Date.now()}`,
        type,
        title: "",
        quantity: 0,
        notes: "",
      },
    ];

    setKitchenReportStatus("draft");
    setKitchenSpecialNotes(nextSpecialNotes);
    void saveLiveNow(currentKitchenPayload({
      kitchenReportStatus: "draft",
      kitchenSpecialNotes: nextSpecialNotes,
    }));
  };

  const updateSpecialNote = (
    rowId: string,
    field: keyof KitchenSpecialNote,
    value: string | number
  ) => {
    const nextSpecialNotes = kitchenSpecialNotes.map((row) => {
      if (row.id !== rowId) return row;

      if (field === "quantity") {
        return { ...row, quantity: clampNumber(value) };
      }

      return { ...row, [field]: value };
    });

    setKitchenReportStatus("draft");
    setKitchenSpecialNotes(nextSpecialNotes);
    void saveLiveNow(currentKitchenPayload({
      kitchenReportStatus: "draft",
      kitchenSpecialNotes: nextSpecialNotes,
    }));
  };

  const removeSpecialNote = (rowId: string) => {
    const nextSpecialNotes = kitchenSpecialNotes.filter((row) => row.id !== rowId);
    setKitchenReportStatus("draft");
    setKitchenSpecialNotes(nextSpecialNotes);
    void saveLiveNow(currentKitchenPayload({
      kitchenReportStatus: "draft",
      kitchenSpecialNotes: nextSpecialNotes,
    }));
  };

  const markKitchenReportSubmitted = () => {
    setKitchenReportStatus("submitted");
    void saveLiveNow(currentKitchenPayload({ kitchenReportStatus: "submitted" }));
  };

  if (!assignedMenu) {
    return (
      <MainCard title="תפריט האירוע" icon={<Utensils size={19} />}>
        {menuError && <ErrorBox text={menuError} />}

        <div className="overflow-hidden rounded-[38px] border border-dashed border-[#c8b48f] bg-[radial-gradient(circle_at_top_right,rgba(138,106,63,0.18),transparent_34%),linear-gradient(135deg,#f8f2e8,#efe6d9,#e7d8c3)] p-8 text-center shadow-[0_18px_45px_rgba(92,60,20,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[26px] border border-[#ded1bf] bg-white text-[#8a6a3f] shadow-sm">
            <Utensils size={32} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#2f2922]">
            עדיין לא נבחר תפריט לאירוע
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#675d50]">
            בוחרים תפריט בסיס של האולם, ולאחר מכן נוצר עותק מקצועי לאירוע — כולל בחירת מנות, התאמות בחירה וניהול לייב בזמן אמת.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onChooseMenu}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#756247] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#6f583a]"
            >
              <Plus size={17} />
              בחר תפריט מתוך תפריטי האולם
            </button>

            <Link
              href={hallId ? `/venues/dashboard/halls/${hallId}/menus` : "/venues/dashboard"}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#c8b48f] bg-white px-6 text-sm font-black text-[#6f583a] transition hover:bg-[#f4eee4]"
            >
              <Utensils size={17} />
              ניהול תפריטי אולם
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[#2f2922]">תפריטים פעילים של האולם</h3>
            <span className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-black text-[#8a6a3f]">
              {menusLoading ? "טוען..." : `${templates.length} תפריטים`}
            </span>
          </div>

          {templates.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-[26px] border border-[#ded1bf] bg-[#faf6ef] p-4 shadow-sm">
                  <div className="text-lg font-black text-[#2f2922]">{template.name}</div>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#675d50]">
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
      <div className="space-y-5">
        {menuError && <ErrorBox text={menuError} />}

        <section className="overflow-hidden rounded-[34px] border border-[#ded1bf] bg-[#fbf8f2] shadow-[0_10px_30px_rgba(47,41,34,0.05)]">
          <div className="border-b border-[#ded1bf] bg-[radial-gradient(circle_at_top_left,rgba(138,106,63,0.16),transparent_34%),linear-gradient(135deg,#f8f2e8,#efe6d9,#e7d8c3)] p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e4c98f] bg-white/80 px-3 py-1 text-xs font-black text-[#6f583a] shadow-sm">
                  <Sparkles size={14} />
                  ניהול לייב לפי קטגוריות ומנות שנבחרו
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#2f2922]">
                  ניהול כמויות בזמן האירוע
                </h2>
                <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#675d50]">
                  כל קטגוריה מוצגת פעם אחת בלבד. בלחיצה על החץ נפתחות המנות שנבחרו תחתיה. עדכון מנה מעדכן אוטומטית את סיכום הקטגוריה.
                </p>
              </div>

              <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[560px]">
                <MetricBox label="כמות מוערכת" value={`${totals.estimated}`} />
                <MetricBox label="כמות בפועל" value={`${totals.actual}`} highlighted />
                <MetricBox
                  label="פער"
                  value={`${totalGap > 0 ? "+" : ""}${totalGap}`}
                  danger={totalGap < 0}
                  success={totalGap > 0}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#756a5d] shadow-sm">
                  {liveSaving || menuSaving ? "שומר שינוי..." : "נשמר אחרי כל שינוי"}
                </span>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black shadow-sm",
                    kitchenReportStatus === "submitted"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  ].join(" ")}
                >
                  {kitchenReportStatus === "submitted" ? "דוח נסגר" : "טיוטה פעילה"}
                </span>
                {assignedMenu.kitchenReportUpdatedAt ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#756a5d] shadow-sm">
                    עודכן: {formatDateTime(assignedMenu.kitchenReportUpdatedAt)}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMenuView("overview")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#ded1bf] bg-white px-5 text-sm font-black text-[#6f6252] transition hover:bg-[#f4eee4]"
              >
                <ArrowRight size={16} />
                חזרה לתפריט האירוע
              </button>
            </div>
          </div>

          <div className="space-y-4 bg-[#f4eee4] p-4">
            {liveGroups.length ? (
              liveGroups.map((group) => (
                <LiveCategoryCard
                  key={group.id}
                  group={group}
                  isOpen={openCategories[group.id] ?? true}
                  onToggle={() =>
                    setOpenCategories((current) => ({
                      ...current,
                      [group.id]: !(current[group.id] ?? true),
                    }))
                  }
                  onCategoryQuantityChange={updateCategoryQuantity}
                  onCategoryActualQuick={quickUpdateCategoryActual}
                  onDishChange={updateDishRow}
                  onDishActualQuick={quickUpdateDishActual}
                  onAddDish={addManualDishToCategory}
                  onRemoveDish={removeDishFromCategory}
                />
              ))
            ) : (
              <EmptyBox text="אין עדיין קטגוריות לניהול לייב. אחרי שבעל האירוע יבחר מנות, הן יופיעו כאן לפי קטגוריות." />
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={liveSaving || menuSaving}
                onClick={markKitchenReportSubmitted}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#756247] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#6f583a] disabled:opacity-60"
              >
                <CheckCircle2 size={17} />
                סגירת דוח לייב
              </button>
            </div>
          </div>
        </section>

        <MainCard title="רגישויות / כשרויות / מנות מיוחדות" icon={<ShieldCheck size={19} />}>
          <div className="rounded-[28px] border border-[#ded1bf] bg-[linear-gradient(135deg,#faf6ef,#f4eee4)] p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-xl font-black text-[#2f2922]">הערות מיוחדות למטבח</h3>
                <p className="mt-1 text-sm font-bold leading-7 text-[#675d50]">
                  רגישויות, כשרויות, טבעוני/צמחוני, ילדים וכל דרישה מיוחדת. כל שינוי נשמר אחרי פעולה.
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
                  className="rounded-full border border-[#c8b48f] bg-white px-4 py-2 text-xs font-black text-[#6f583a] transition hover:bg-[#f4eee4]"
                >
                  + {kitchenSpecialTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {kitchenSpecialNotes.length ? (
              kitchenSpecialNotes.map((row) => (
                <div key={row.id} className="rounded-[24px] border border-[#ded1bf] bg-[#fbf8f2] p-4 shadow-[0_8px_24px_rgba(47,41,34,0.05)]">
                  <div className="grid gap-3 lg:grid-cols-[190px_1fr_120px_1.4fr_44px] lg:items-end">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black text-[#756a5d]">סוג</span>
                      <select
                        value={row.type}
                        onChange={(event) => updateSpecialNote(row.id, "type", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-[#ded1bf] bg-[#faf6ef] px-3 text-sm font-black text-[#2f2922] outline-none focus:border-[#8a6a3f]"
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
                      onChange={(value) => updateSpecialNote(row.id, "title", value)}
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
                      onChange={(value) => updateSpecialNote(row.id, "notes", value)}
                      placeholder="לדוגמה: להכין בנפרד"
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
              <EmptyBox text="אין עדיין רגישויות, כשרויות או מנות מיוחדות." />
            )}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black text-[#756a5d]">הערה כללית למטבח</span>
            <textarea
              value={kitchenGeneralNotes}
              onChange={(event) => setKitchenGeneralNotes(event.target.value)}
              onBlur={() => {
                setKitchenReportStatus("draft");
                void saveLiveNow(currentKitchenPayload({
                  kitchenReportStatus: "draft",
                  kitchenGeneralNotes,
                }));
              }}
              placeholder="לדוגמה: לפתוח טבעוני ראשון, לשים לב למנות ילדים בשולחנות 3 ו-8"
              className="min-h-[110px] w-full rounded-2xl border border-[#ded1bf] bg-[#faf6ef] p-3 text-sm font-bold text-[#2f2922] outline-none focus:border-[#8a6a3f]"
            />
          </label>
        </MainCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {menuError && <ErrorBox text={menuError} />}

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <MainCard title="תפריט משויך לאירוע" icon={<Utensils size={19} />}>
          <div className="rounded-[30px] border border-[#ded1bf] bg-[radial-gradient(circle_at_top_right,rgba(138,106,63,0.15),transparent_32%),linear-gradient(135deg,#f7f0e5,#efe5d5,#e8d9c4)] p-5 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e4c98f] bg-white/80 px-3 py-1 text-xs font-black text-[#6f583a]">
              <Layers3 size={14} />
              עותק תפריט לאירוע
            </div>
            <h2 className="mt-3 text-2xl font-black text-[#2f2922]">{assignedMenu.name}</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#675d50]">
              כאן מנהלים את התפריט שנשלח לבעל האירוע. ניהול הלייב נמצא במסך ייעודי, לפי קטגוריות ומנות שנבחרו בפועל.
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black text-[#756a5d]">הערה לאירוע הספציפי הזה</span>
              <textarea
                value={assignedMenu.eventNote || ""}
                onChange={(event) => onUpdateEventNote(event.target.value)}
                placeholder="לדוגמה: לזוג הזה לאפשר 2 עיקריות במקום 1 / לא להציג מנה מסוימת / הערת אלרגנים"
                className="min-h-[92px] w-full rounded-2xl border border-[#ded1bf] bg-white p-3 text-sm font-bold text-[#2f2922] outline-none focus:border-[#8a6a3f]"
              />
            </label>
          </div>

          <MenuEditPolicyBox
            selectionEditMode={assignedMenu.selectionEditMode || "untilDate"}
            selectionEditableUntil={assignedMenu.selectionEditableUntil || ""}
            lockedAt={assignedMenu.lockedAt || null}
            lockedReason={assignedMenu.lockedReason || ""}
            onChangeMode={(value) => onUpdateSelectionPolicy({ selectionEditMode: value })}
            onChangeEditableUntil={(value) => onUpdateSelectionPolicy({ selectionEditableUntil: value })}
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMenuView("live")}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#342d25] text-sm font-black text-white shadow-sm transition hover:bg-[#2a241f]"
            >
              <Sparkles size={16} />
              ניהול לייב באירוע
            </button>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#c8b48f] bg-[#f4eee4] text-sm font-black text-[#6f583a]"
            >
              <Send size={16} />
              שליחת SMS לבחירת מנות
            </button>
          </div>

          <button
            type="button"
            disabled={menuSaving}
            onClick={onSaveChanges}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#ded1bf] bg-[#fbf8f2] text-sm font-black text-[#6f6252] disabled:opacity-60"
          >
            <Save size={16} />
            {menuSaving ? "שומר..." : "שמירת התאמות תפריט"}
          </button>
        </MainCard>

        <MainCard title="קישור אישי" icon={<Link2 size={19} />}>
          <div className="rounded-2xl border border-[#ded1bf] bg-[#faf6ef] p-4">
            <div className="text-xs font-black text-[#756a5d]">קישור אישי לבחירת מנות</div>
            <div className="mt-2 break-all text-sm font-black leading-6 text-[#2f2922]">{publicLink}</div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={assignedMenu.publicLink || `/menus/choose/${assignedMenu.publicToken || eventId}`}
              target="_blank"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#ded1bf] bg-[#fbf8f2] text-sm font-black text-[#6f6252]"
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
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#c8b48f] bg-[#f4eee4] text-sm font-black text-[#6f583a]"
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
            <StatusLine label="ניהול לייב פעיל" done={liveGroups.length > 0} />
          </div>
        </MainCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <MainCard title="בחירות בעל האירוע" icon={<ClipboardList size={19} />}>
          {(assignedMenu.selectedDishes || []).length ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-base font-black text-emerald-800">בעל האירוע שמר בחירת מנות</div>
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
                  <div key={categoryTitle} className="rounded-2xl border border-[#ded1bf] bg-[#faf6ef] p-4">
                    <div className="mb-3 text-sm font-black text-[#2f2922]">{categoryTitle}</div>
                    <div className="flex flex-wrap gap-2">
                      {dishes.map((dish) => (
                        <span
                          key={`${dish.categoryId}-${dish.dishId}`}
                          className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-black text-[#6f583a]"
                        >
                          {dish.dishName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {assignedMenu.customerNote ? (
                <div className="rounded-2xl border border-[#ded1bf] bg-[#fbf8f2] p-4">
                  <div className="text-xs font-black text-[#756a5d]">הערות בעל האירוע</div>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#2f2922]">{assignedMenu.customerNote}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#c8b48f] bg-[#f4eee4] p-5">
              <div className="text-base font-black text-[#2f2922]">עדיין לא נבחרו מנות</div>
              <p className="mt-2 text-sm font-bold leading-7 text-[#675d50]">
                אחרי שבעל האירוע יפתח את הקישור האישי וישמור בחירה, המנות יופיעו כאן אוטומטית.
              </p>
            </div>
          )}
        </MainCard>

        <MainCard title="התאמות בחירה לאירוע הזה" icon={<Edit3 size={19} />}>
          <div className="rounded-2xl border border-[#ded1bf] bg-[#f4eee4] p-4 text-sm font-bold leading-7 text-[#675d50]">
            כאן האולם משנה את כמות הבחירות רק עבור האירוע הזה. ניהול לייב נמצא בכפתור נפרד למעלה.
          </div>

          <div className="mt-4 space-y-3">
            {assignedMenu.categoryOverrides.length ? (
              assignedMenu.categoryOverrides.map((category) => (
                <div key={category.id} className="rounded-2xl border border-[#ded1bf] bg-[#faf6ef] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-base font-black text-[#2f2922]">{category.name}</div>
                      <div className="mt-1 text-xs font-bold text-[#756a5d]">
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
                    <span className="mb-1 block text-xs font-black text-[#756a5d]">הערה לקטגוריה באירוע הזה</span>
                    <input
                      value={category.eventNote}
                      onChange={(event) => onUpdateCategory(category.id, "eventNote", event.target.value)}
                      placeholder="הערה שתישמר רק לאירוע הזה"
                      className="h-11 w-full rounded-2xl border border-[#ded1bf] bg-white px-3 text-sm font-bold text-[#2f2922] outline-none focus:border-[#8a6a3f]"
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
    </div>
  );
}

function LiveCategoryCard({
  group,
  isOpen,
  onToggle,
  onCategoryQuantityChange,
  onCategoryActualQuick,
  onDishChange,
  onDishActualQuick,
  onAddDish,
  onRemoveDish,
}: {
  group: LiveCategory;
  isOpen: boolean;
  onToggle: () => void;
  onCategoryQuantityChange: (
    categoryId: string,
    field: "plannedQuantity" | "actualServedQuantity",
    value: string | number
  ) => void;
  onCategoryActualQuick: (categoryId: string, diff: number) => void;
  onDishChange: (
    categoryId: string,
    rowId: string,
    field: keyof Pick<KitchenReportDish, "plannedQuantity" | "actualServedQuantity" | "notes" | "dishName">,
    value: string | number
  ) => void;
  onDishActualQuick: (categoryId: string, rowId: string, diff: number) => void;
  onAddDish: (categoryId: string) => void;
  onRemoveDish: (categoryId: string, rowId: string) => void;
}) {
  const diff = clampNumber(group.directSummary.actualServedQuantity) - clampNumber(group.directSummary.plannedQuantity);

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#d7c7b2] bg-[#fdf9f2] shadow-[0_16px_42px_rgba(47,41,34,0.07)]">
      <div className="bg-[linear-gradient(135deg,#efe5d6,#f8f2e8)] p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_160px_160px_210px_90px_54px] xl:items-center">
          <button type="button" onClick={onToggle} className="flex items-center gap-3 text-right">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#8a6a3f] shadow-sm">
              {isOpen ? <ChevronDown size={20} /> : <ChevronLeft size={20} />}
            </span>
            <span>
              <span className="block text-xl font-black text-[#2f2922]">{group.title}</span>
              <span className="mt-1 block text-xs font-bold leading-5 text-[#675d50]">{group.subtitle}</span>
            </span>
          </button>

          <LiveNumberInput
            label="כמות מוערכת בקטגוריה"
            value={group.directSummary.plannedQuantity}
            onChange={(value) => onCategoryQuantityChange(group.id, "plannedQuantity", value)}
          />

          <LiveNumberInput
            label="כמות בפועל בקטגוריה"
            value={group.directSummary.actualServedQuantity}
            onChange={(value) => onCategoryQuantityChange(group.id, "actualServedQuantity", value)}
            highlighted
          />

          <div>
            <div className="mb-1 text-center text-[11px] font-black text-[#756a5d]">עדכון מהיר לקטגוריה</div>
            <div className="flex items-center justify-center gap-2">
              <QuickButton onClick={() => onCategoryActualQuick(group.id, -1)} label="−" />
              <QuickButton onClick={() => onCategoryActualQuick(group.id, 1)} label="+" primary />
              <QuickButton onClick={() => onCategoryActualQuick(group.id, 10)} label="10+" />
            </div>
          </div>

          <GapBadge value={diff} />

          <button
            type="button"
            onClick={() => onAddDish(group.id)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c8b48f] bg-[#fbf8f2] text-[#6f583a] transition hover:bg-[#f4eee4]"
            title="הוספת מנה ידנית תחת הקטגוריה"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="divide-y divide-[#e8dcc9] bg-[#fbf7f0]">
          {group.dishes.length ? (
            group.dishes.map((dish) => {
              const dishDiff = clampNumber(dish.actualServedQuantity) - clampNumber(dish.plannedQuantity);

              return (
                <div key={dish.id} className="grid gap-3 p-4 xl:grid-cols-[minmax(260px,1fr)_160px_160px_210px_90px_minmax(240px,1fr)_54px] xl:items-center">
                  <InputEdit
                    label="מנה"
                    value={dish.dishName}
                    onChange={(value) => onDishChange(group.id, dish.id, "dishName", value)}
                    placeholder="שם מנה"
                  />

                  <LiveNumberInput
                    label="כמות מוערכת"
                    value={dish.plannedQuantity}
                    onChange={(value) => onDishChange(group.id, dish.id, "plannedQuantity", value)}
                  />

                  <LiveNumberInput
                    label="כמות בפועל"
                    value={dish.actualServedQuantity}
                    onChange={(value) => onDishChange(group.id, dish.id, "actualServedQuantity", value)}
                    highlighted
                  />

                  <div>
                    <div className="mb-1 text-center text-[11px] font-black text-[#756a5d]">עדכון מהיר</div>
                    <div className="flex items-center justify-center gap-2">
                      <QuickButton onClick={() => onDishActualQuick(group.id, dish.id, -1)} label="−" />
                      <QuickButton onClick={() => onDishActualQuick(group.id, dish.id, 1)} label="+" primary />
                      <QuickButton onClick={() => onDishActualQuick(group.id, dish.id, 10)} label="10+" />
                    </div>
                  </div>

                  <GapBadge value={dishDiff} />

                  <InputEdit
                    label="הערות"
                    value={dish.notes}
                    onChange={(value) => onDishChange(group.id, dish.id, "notes", value)}
                    placeholder="לדוגמה: יצאו עוד 5 בגלל בקשות במקום"
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveDish(group.id, dish.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-4">
              <EmptyBox text="אין מנות תחת הקטגוריה הזאת. אפשר להשאיר כמות כללית או להוסיף מנה ידנית." />
            </div>
          )}
        </div>
      ) : null}
    </div>
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
    <div className="mt-4 rounded-[24px] border border-[#ded1bf] bg-[#fbf8f2] p-4">
      <div className="text-sm font-black text-[#2f2922]">אפשרות עריכה לבעל האירוע</div>
      <p className="mt-1 text-xs font-bold leading-5 text-[#675d50]">
        ההגבלה הזאת חלה רק על בעל האירוע בקישור האישי. האולם יכול לערוך ולעדכן תמיד מתוך הדשבורד.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChangeMode("untilDate")}
          className={[
            "rounded-2xl border p-4 text-right transition",
            isUntilDate
              ? "border-[#8a6a3f] bg-[#f4eee4] text-[#6f583a]"
              : "border-[#ded1bf] bg-[#faf6ef] text-[#6f6252] hover:bg-[#f4eee4]",
          ].join(" ")}
        >
          <div className="text-sm font-black">ניתן לעדכן עד תאריך</div>
          <div className="mt-1 text-xs font-bold leading-5">אחרי התאריך שהאולם הגדיר, בעל האירוע יראה את התפריט לצפייה בלבד.</div>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode("lockAfterSubmit")}
          className={[
            "rounded-2xl border p-4 text-right transition",
            !isUntilDate
              ? "border-[#8a6a3f] bg-[#f4eee4] text-[#6f583a]"
              : "border-[#ded1bf] bg-[#faf6ef] text-[#6f6252] hover:bg-[#f4eee4]",
          ].join(" ")}
        >
          <div className="text-sm font-black">ננעל לאחר בחירה ראשונה</div>
          <div className="mt-1 text-xs font-bold leading-5">אחרי שבעל האירוע שומר פעם אחת, הוא יוכל לראות את התפריט בלבד.</div>
        </button>
      </div>

      {isUntilDate ? (
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-black text-[#756a5d]">ניתן לעדכן עד תאריך ושעה</span>
          <input
            type="datetime-local"
            value={formatDateTimeInputValue(selectionEditableUntil)}
            onChange={(event) => onChangeEditableUntil(event.target.value)}
            className="h-11 w-full rounded-2xl border border-[#ded1bf] bg-[#faf6ef] px-3 text-sm font-bold text-[#2f2922] outline-none focus:border-[#8a6a3f]"
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
    <div className="flex items-center justify-between rounded-2xl border border-[#ded1bf] bg-[#f5efe6] px-3 py-3">
      <span className="text-sm font-black text-[#2f2922]">{label}</span>
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

function MetricBox({
  label,
  value,
  highlighted,
  danger,
  success,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 text-center shadow-sm",
        highlighted
          ? "border-[#c8b48f] bg-[#f4eee4]"
          : "border-[#ded1bf] bg-white",
      ].join(" ")}
    >
      <div className="text-xs font-black text-[#756a5d]">{label}</div>
      <div
        className={[
          "mt-1 text-2xl font-black",
          danger ? "text-rose-700" : success ? "text-emerald-700" : highlighted ? "text-[#8a6a3f]" : "text-[#2f2922]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function LiveNumberInput({
  label,
  value,
  onChange,
  highlighted,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  highlighted?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-center text-[11px] font-black text-[#756a5d]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "h-12 w-full rounded-2xl border px-3 text-center text-lg font-black outline-none transition focus:border-[#8a6a3f] focus:ring-4 focus:ring-[#d5a046]/10",
          highlighted
            ? "border-[#c8b48f] bg-[#f4eee4] text-[#8a6a3f]"
            : "border-[#ded1bf] bg-white text-[#2f2922]",
        ].join(" ")}
      />
    </label>
  );
}

function QuickButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-black transition",
        primary
          ? "bg-[#756247] text-white hover:bg-[#5f503b]"
          : "border border-[#c8b48f] bg-[#fbf8f2] text-[#6f583a] hover:bg-[#f4eee4]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function GapBadge({ value }: { value: number }) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[11px] font-black text-[#756a5d]">פער</div>
      <span
        className={[
          "inline-flex min-w-[58px] justify-center rounded-full px-3 py-2 text-xs font-black",
          value > 0
            ? "bg-emerald-50 text-emerald-700"
            : value < 0
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-100 text-slate-600",
        ].join(" ")}
      >
        {value > 0 ? "+" : ""}
        {value}
      </span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ded1bf] bg-[#fbf8f2] px-3 py-2">
      <div className="text-[11px] font-black text-[#756a5d]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2f2922]">{value}</div>
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
    <section className="rounded-[30px] border border-[#ded1bf] bg-[#fbf8f2] p-5 shadow-[0_14px_38px_rgba(47,41,34,0.06)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eee3d2] text-[#8a6a3f]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#2f2922]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InputEdit({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#756a5d]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#ded1bf] bg-[#faf6ef] px-3 text-sm font-bold text-[#2f2922] outline-none transition focus:border-[#8a6a3f] focus:ring-4 focus:ring-[#d5a046]/10"
      />
    </label>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#c8b48f] bg-[#f6f0e6] p-4 text-center text-sm font-bold leading-6 text-[#675d50]">
      {text}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
      {text}
    </div>
  );
}
