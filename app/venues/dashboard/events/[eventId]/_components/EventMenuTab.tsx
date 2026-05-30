"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CakeSlice,
  CalendarDays,
  ConciergeBell,
  Copy,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Edit3,
  Eye,
  ExternalLink,
  Layers3,
  Link2,
  Plus,
  Save,
  Send,
  Salad,
  ShieldCheck,
  Sparkles,
  Soup,
  Trash2,
  Drumstick,
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

  const [initialAssignedMenuResolved, setInitialAssignedMenuResolved] = useState(
    Boolean(assignedMenu)
  );

  useEffect(() => {
    if (assignedMenu) {
      setInitialAssignedMenuResolved(true);
      return;
    }

    setInitialAssignedMenuResolved(false);

    const timer = window.setTimeout(() => {
      setInitialAssignedMenuResolved(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [eventId, assignedMenu?.id]);

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


  const selectedDishesCount = assignedMenu?.selectedDishes?.length || 0;
  const selectedCategoriesCount = Object.keys(selectedDishGroups).length;

  const choiceQuantityCards = useMemo(() => {
    const overrides = Array.isArray(assignedMenu?.categoryOverrides)
      ? assignedMenu.categoryOverrides
      : [];

    const selectedByCategory = (assignedMenu?.selectedDishes || []).reduce(
      (map, dish) => {
        const key = dish.categoryId || dish.categoryTitle || "general";
        map[key] = (map[key] || 0) + 1;
        return map;
      },
      {} as Record<string, number>
    );

    return overrides.map((category, index) => {
      const selectedCount = selectedByCategory[category.id] || 0;
      const choices = clampNumber(category.eventMaxChoices || category.maxChoices || 0);
      const dishesCount = clampNumber(category.dishesCount || 0);

      return {
        id: category.id,
        name: category.name || `קטגוריה ${index + 1}`,
        selectedCount,
        choices,
        dishesCount,
        totalPortions: selectedCount * 120 || choices * 120,
        eventNote: category.eventNote || "",
        originalChoices: category.originalMaxChoices || category.maxChoices || choices,
        index,
      };
    });
  }, [assignedMenu?.categoryOverrides, assignedMenu?.selectedDishes]);

  const categorySelectorItems = useMemo(() => {
    const selectedTitles = Object.keys(selectedDishGroups);

    if (selectedTitles.length) {
      return selectedTitles.map((title, index) => ({
        id: title,
        title,
        count: selectedDishGroups[title]?.length || 0,
        index,
      }));
    }

    return choiceQuantityCards.map((category, index) => ({
      id: category.name,
      title: category.name,
      count: category.dishesCount || category.choices || 0,
      index,
    }));
  }, [choiceQuantityCards, selectedDishGroups]);

  const [activeSelectedCategory, setActiveSelectedCategory] = useState("");

  useEffect(() => {
    if (!categorySelectorItems.length) {
      setActiveSelectedCategory("");
      return;
    }

    setActiveSelectedCategory((current) => {
      if (current && categorySelectorItems.some((item) => item.id === current)) return current;
      return categorySelectorItems[0].id;
    });
  }, [categorySelectorItems]);

  const activeCategory =
    categorySelectorItems.find((item) => item.id === activeSelectedCategory) ||
    categorySelectorItems[0] ||
    null;

  const activeCategoryDishes = activeCategory
    ? selectedDishGroups[activeCategory.title] || []
    : [];

  const ActiveCategoryIcon = activeCategory
    ? getCategoryIcon(activeCategory.title, activeCategory.index)
    : Utensils;

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

  if (!assignedMenu && !initialAssignedMenuResolved) {
    return (
      <MainCard title="תפריט האירוע" icon={<Utensils size={19} />}>
        {menuError && <ErrorBox text={menuError} />}

        <div className="overflow-hidden rounded-[30px] border border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#fbf3e8,#f4eadc)] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#eadfce] bg-white text-[#8b6334] shadow-sm">
            <Utensils size={28} />
          </div>

          <h2 className="mt-4 text-xl font-black text-[#2b241c]">
            טוען תפריט אירוע...
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
            בודקים אם כבר קיים תפריט משויך לאירוע.
          </p>
        </div>
      </MainCard>
    );
  }

  if (!assignedMenu) {
    return (
      <MainCard title="תפריט האירוע" icon={<Utensils size={19} />}>
        {menuError && <ErrorBox text={menuError} />}

        <div className="overflow-hidden rounded-[38px] border border-dashed border-[#d9bd83] bg-[radial-gradient(circle_at_top_right,#fff3d5,transparent_34%),linear-gradient(135deg,#fffdf8,#fff7e7,#f6ead7)] p-8 text-center shadow-[0_18px_45px_rgba(92,60,20,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[26px] border border-[#eadfce] bg-white text-[#b98121] shadow-sm">
            <Utensils size={32} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#2b241c]">
            עדיין לא נבחר תפריט לאירוע
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
            בוחרים תפריט בסיס של האולם, ולאחר מכן נוצר עותק מקצועי לאירוע — כולל בחירת מנות, התאמות בחירה וניהול לייב בזמן אמת.
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
              href={hallId ? `/venues/dashboard/halls/${hallId}/menus` : "/venues/dashboard"}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white px-6 text-sm font-black text-[#9f6f1a] transition hover:bg-[#fff8eb]"
            >
              <Utensils size={17} />
              ניהול תפריטי אולם
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[#2b241c]">תפריטים פעילים של האולם</h3>
            <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#b98121]">
              {menusLoading ? "טוען..." : `${templates.length} תפריטים`}
            </span>
          </div>

          {templates.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4 shadow-sm">
                  <div className="text-lg font-black text-[#2b241c]">{template.name}</div>
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
      <div className="space-y-5">
        {menuError && <ErrorBox text={menuError} />}

        <section className="overflow-hidden rounded-[38px] border border-[#e0d2bd] bg-[#f3eadc] shadow-[0_22px_55px_rgba(47,35,20,0.10)]">
          <div className="relative overflow-hidden border-b border-[#dfd2bd] bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.9),transparent_28%),linear-gradient(135deg,#f8f0e4_0%,#eadbc7_48%,#d9c5aa_100%)] p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e4c98f] bg-white/80 px-3 py-1 text-xs font-black text-[#9f6f1a] shadow-sm">
                  <Sparkles size={14} />
                  ניהול לייב לפי קטגוריות ומנות שנבחרו
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#2b241c]">
                  ניהול כמויות בזמן האירוע
                </h2>
                <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#7f705d]">
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
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8a7b68] shadow-sm">
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
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8a7b68] shadow-sm">
                    עודכן: {formatDateTime(assignedMenu.kitchenReportUpdatedAt)}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMenuView("overview")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 text-sm font-black text-[#6f6252] transition hover:bg-[#fff8eb]"
              >
                <ArrowRight size={16} />
                חזרה לתפריט האירוע
              </button>
            </div>
          </div>

          <div className="space-y-4 bg-[#f4eadc] p-4">
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
                className="inline-flex h-12 items-center gap-2 rounded-[20px] bg-[#6f5a42] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#574633] disabled:opacity-60"
              >
                <CheckCircle2 size={17} />
                סגירת דוח לייב
              </button>
            </div>
          </div>
        </section>

        <MainCard title="רגישויות / כשרויות / מנות מיוחדות" icon={<ShieldCheck size={19} />}>
          <div className="rounded-[28px] border border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#fff8eb)] p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-xl font-black text-[#2b241c]">הערות מיוחדות למטבח</h3>
                <p className="mt-1 text-sm font-bold leading-7 text-[#7f705d]">
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
                <div key={row.id} className="rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-sm">
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
            <span className="mb-2 block text-xs font-black text-[#8a7b68]">הערה כללית למטבח</span>
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
              className="min-h-[110px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />
          </label>
        </MainCard>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {menuError && <ErrorBox text={menuError} />}

      <section className="relative overflow-hidden rounded-[38px] border border-[#e6dccb] bg-[radial-gradient(circle_at_top_right,rgba(255,246,226,0.95),transparent_34%),linear-gradient(135deg,#fffdf8_0%,#fbf3e8_46%,#f2e5d2_100%)] p-5 shadow-[0_24px_70px_rgba(47,35,20,0.10)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-20 h-72 w-72 rounded-full bg-[#d8b46f]/10 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
          <div className="flex min-h-[240px] flex-col justify-between overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(48,38,29,0.76),rgba(82,62,44,0.42)),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.34),transparent_32%),linear-gradient(135deg,#d7b98e,#efe3d0)] p-7 text-white shadow-[0_22px_55px_rgba(47,35,20,0.16)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/18 px-4 py-2 text-xs font-black backdrop-blur">
                <Sparkles size={14} />
                תפריט אירוע פעיל
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-black backdrop-blur">
                <CalendarDays size={14} />
                {assignedMenu.updatedAt ? formatDateTime(assignedMenu.updatedAt) : "עודכן לאחרונה"}
              </span>
            </div>

            <div className="mt-10 max-w-2xl">
              <p className="text-sm font-black text-white/75">ניהול תפריט לאירוע</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                {assignedMenu.name}
              </h1>
              <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-white/82">
                מסך נקי וממוקד: קטגוריות התפריט, המנות שנבחרו וכמויות — בלי עומס של פיננסים, פרטי לקוח או תפריט צד.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <PremiumHeroStat label="קטגוריות" value={`${choiceQuantityCards.length || selectedCategoriesCount}`} />
              <PremiumHeroStat label="מנות שנבחרו" value={`${selectedDishesCount}`} />
              <PremiumHeroStat label="סטטוס" value={assignedMenu.coupleSelected ? "נבחר" : "ממתין"} />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[30px] border border-[#eadfce] bg-white/88 p-5 shadow-[0_16px_40px_rgba(47,35,20,0.07)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-[#2b241c]">סטטוס תפריט</h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {assignedMenu.coupleSelected ? "בחירה נשמרה" : "ממתין לבחירה"}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <StatusMini label="תפריט נבחר" done />
                <StatusMini label="קישור נשלח" done={assignedMenu.sentToCouple} />
                <StatusMini label="בחירת מנות" done={assignedMenu.coupleSelected} />
                <StatusMini label="לייב מוכן" done={liveGroups.length > 0} />
              </div>

              <button
                type="button"
                onClick={() => setMenuView("live")}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#2f261e] text-sm font-black text-white shadow-sm transition hover:bg-[#4a3829]"
              >
                <Sparkles size={16} />
                מעבר לניהול לייב באירוע
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.42fr_0.58fr]" dir="ltr">
        <aside className="space-y-5" dir="rtl">
          <section className="overflow-hidden rounded-[34px] border border-[#e6dccb] bg-white shadow-[0_20px_55px_rgba(47,35,20,0.075)]">
            <div className="border-b border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#f7efe3)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#eadfce] bg-white text-[#9f6f1a] shadow-sm">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#2b241c]">אפשרות עריכה לבעל האירוע</h2>
                  <p className="mt-1 text-xs font-bold text-[#8a7b68]">ההגבלה חלה רק על הקישור האישי</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <MenuEditPolicyBox
                selectionEditMode={assignedMenu.selectionEditMode || "untilDate"}
                selectionEditableUntil={assignedMenu.selectionEditableUntil || ""}
                lockedAt={assignedMenu.lockedAt || null}
                lockedReason={assignedMenu.lockedReason || ""}
                onChangeMode={(value) => onUpdateSelectionPolicy({ selectionEditMode: value })}
                onChangeEditableUntil={(value) => onUpdateSelectionPolicy({ selectionEditableUntil: value })}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[34px] border border-[#e6dccb] bg-white shadow-[0_20px_55px_rgba(47,35,20,0.075)]">
            <div className="border-b border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#f7efe3)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#9f6f1a]">
                    <Link2 size={14} />
                    קישור אישי
                  </div>
                  <h2 className="mt-3 text-xl font-black text-[#2b241c]">שליחה לבחירת מנות</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
                    הקישור נשאר זמין לבעל האירוע לפי מדיניות העריכה שהוגדרה.
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-[#eadfce] bg-[#fffdf8] text-[#8b6334] shadow-sm">
                  <Link2 size={20} />
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-[22px] border border-[#eadfce] bg-[#fffdf8] p-3">
                <div className="break-all text-left text-xs font-black leading-6 text-[#2b241c]" dir="ltr">
                  {publicLink}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-xs font-black text-[#9f6f1a] transition hover:bg-[#fff3d8]"
                >
                  <Copy size={15} />
                  העתקה
                </button>

                <Link
                  href={assignedMenu.publicLink || `/menus/choose/${assignedMenu.publicToken || eventId}`}
                  target="_blank"
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-xs font-black text-[#6f6252] transition hover:bg-[#fff8eb]"
                >
                  <ExternalLink size={15} />
                  תצוגה
                </Link>

                <button
                  type="button"
                  onClick={onSendToCouple}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f5a42] text-xs font-black text-white shadow-sm transition hover:bg-[#574633]"
                >
                  <Send size={15} />
                  SMS
                </button>
              </div>
            </div>
          </section>
        </aside>

        <main className="space-y-5" dir="rtl">
          <section className="overflow-hidden rounded-[38px] border border-[#e6dccb] bg-white shadow-[0_24px_70px_rgba(47,35,20,0.08)]">
            <div className="border-b border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#f7efe3)] px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#eadfce] bg-white text-[#9f6f1a] shadow-sm">
                    <Utensils size={21} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#2b241c]">תפריט נבחר</h2>
                    <p className="mt-1 text-xs font-bold text-[#8a7b68]">בחרו קטגוריה — רק המנות של הקטגוריה שנבחרה יוצגו</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#fff4dc] px-4 py-2 text-xs font-black text-[#9f6f1a]">
                    {selectedDishesCount} מנות נבחרו
                  </span>
                  <span className="rounded-full bg-[#f5efe6] px-4 py-2 text-xs font-black text-[#6f6252]">
                    {selectedCategoriesCount || choiceQuantityCards.length} קטגוריות
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5">
              {categorySelectorItems.length ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {categorySelectorItems.map((category) => {
                      const Icon = getCategoryIcon(category.title, category.index);
                      const isActive = activeCategory?.id === category.id;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setActiveSelectedCategory(category.id)}
                          className={[
                            "group rounded-[26px] border p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(47,35,20,0.08)]",
                            isActive
                              ? "border-[#b98121] bg-[linear-gradient(135deg,#fff8eb,#fffdf8)] text-[#8c5f19]"
                              : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fff8eb]",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[22px] border border-[#eadfce] bg-white text-[#9f6f1a] shadow-sm">
                              <Icon size={24} />
                            </div>
                            {isActive ? (
                              <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-[11px] font-black text-[#9f6f1a]">
                                נבחר
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-4 text-lg font-black text-[#2b241c]">{category.title}</div>
                          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                            {category.count} מנות בקטגוריה
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[30px] border border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#fff9ef)] p-4 shadow-[0_14px_36px_rgba(47,35,20,0.06)]">
                    <div className="mb-4 flex flex-col gap-3 border-b border-[#eadfce] pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#e2d2b8] bg-white text-[#9f6f1a] shadow-sm">
                          <ActiveCategoryIcon size={22} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-[#2b241c]">
                            {activeCategory?.title || "קטגוריה"}
                          </h3>
                          <p className="mt-0.5 text-xs font-bold text-[#8a7b68]">
                            מוצגות רק המנות של הקטגוריה שנבחרה
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-[#fff4dc] px-4 py-2 text-xs font-black text-[#9f6f1a]">
                        {activeCategoryDishes.length} מנות
                      </span>
                    </div>

                    {activeCategoryDishes.length ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {activeCategoryDishes.map((dish) => {
                          const Icon = getCategoryIcon(dish.categoryTitle, activeCategory?.index || 0);

                          return (
                            <div
                              key={`${dish.categoryId}-${dish.dishId}`}
                              className="group rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(47,35,20,0.08)]"
                            >
                              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#fff4dc] text-[#9f6f1a] transition group-hover:bg-[#f7e4bd]">
                                <Icon size={24} />
                              </div>
                              <div className="text-base font-black text-[#2b241c]">{dish.dishName}</div>
                              <div className="mt-2 inline-flex rounded-full bg-[#f5efe6] px-3 py-1 text-[11px] font-black text-[#7f705d]">
                                מנה שנבחרה לאירוע
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[26px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-6 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#9f6f1a] shadow-sm">
                          <Utensils size={26} />
                        </div>
                        <h3 className="mt-4 text-lg font-black text-[#2b241c]">אין עדיין מנות מוצגות בקטגוריה הזאת</h3>
                        <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7f705d]">
                          אחרי שבעל האירוע ישמור בחירה בקישור האישי, יוצגו כאן רק המנות של הקטגוריה שנבחרה.
                        </p>
                      </div>
                    )}
                  </div>

                  {assignedMenu.customerNote ? (
                    <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-5">
                      <div className="text-xs font-black text-[#8a7b68]">הערות בעל האירוע</div>
                      <p className="mt-2 text-sm font-bold leading-7 text-[#2b241c]">{assignedMenu.customerNote}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[30px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#9f6f1a] shadow-sm">
                    <Utensils size={26} />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-[#2b241c]">עדיין לא נבחרו מנות</h3>
                  <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
                    אחרי שבעל האירוע ישמור בחירה בקישור האישי, המנות יופיעו כאן לפי קטגוריה אחת בכל פעם.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </section>

      <section className="overflow-hidden rounded-[38px] border border-[#e6dccb] bg-[#fbf6ed] shadow-[0_24px_70px_rgba(47,35,20,0.08)]">
        <div className="border-b border-[#eadfce] bg-[linear-gradient(135deg,#f7efe3,#efe2d0)] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/70 bg-white text-[#9f6f1a] shadow-sm">
                <ClipboardList size={21} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#2b241c]">בחירות וכמויות</h2>
                <p className="mt-1 text-xs font-bold text-[#8a7b68]">סיכום נקי של בחירות וכמות לכל קטגוריה</p>
              </div>
            </div>

            <button
              type="button"
              disabled={menuSaving}
              onClick={onSaveChanges}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:opacity-60"
            >
              <Save size={16} />
              {menuSaving ? "שומר..." : "שמירת כמויות"}
            </button>
          </div>
        </div>

        <div className="p-5">
          {choiceQuantityCards.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {choiceQuantityCards.map((category) => {
                const Icon = getCategoryIcon(category.name, category.index);
                return (
                  <article
                    key={category.id}
                    className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-[0_14px_36px_rgba(47,35,20,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(47,35,20,0.09)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#eadfce] bg-[#fffdf8] text-[#9f6f1a] shadow-sm">
                        <Icon size={25} />
                      </div>
                      <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-[11px] font-black text-[#9f6f1a]">
                        {category.selectedCount ? `${category.selectedCount} נבחרו` : "ממתין"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-black text-[#2b241c]">{category.name}</h3>
                    <p className="mt-1 text-xs font-bold text-[#8a7b68]">
                      במקור: בחירה {category.originalChoices} מתוך {category.dishesCount || "המוגדרות"}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-[20px] bg-[#fff8eb] p-3 text-center">
                        <div className="text-[11px] font-black text-[#8a7b68]">כמה לבחירה</div>
                        <div className="mt-1 text-2xl font-black text-[#2b241c]">{category.choices}</div>
                      </div>
                      <div className="rounded-[20px] bg-[#f5efe6] p-3 text-center">
                        <div className="text-[11px] font-black text-[#8a7b68]">סה״כ מנות</div>
                        <div className="mt-1 text-2xl font-black text-[#2b241c]">{category.totalPortions}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <InputEdit
                        label="עדכון כמות בחירה"
                        type="number"
                        value={String(category.choices)}
                        onChange={(value) => onUpdateCategory(category.id, "eventChoices", value)}
                      />
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs font-black text-[#8a7b68]">הערה לקטגוריה</span>
                      <input
                        value={category.eventNote}
                        onChange={(event) => onUpdateCategory(category.id, "eventNote", event.target.value)}
                        placeholder="הערה שתישמר רק לאירוע הזה"
                        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyBox text="לתפריט הזה אין קטגוריות עם חוקי בחירה." />
          )}
        </div>
      </section>

      <MainCard title="הערת תפריט לאירוע" icon={<Edit3 size={19} />}>
        <label className="block">
          <span className="mb-2 block text-xs font-black text-[#8a7b68]">הערה לאירוע הספציפי הזה</span>
          <textarea
            value={assignedMenu.eventNote || ""}
            onChange={(event) => onUpdateEventNote(event.target.value)}
            placeholder="לדוגמה: לזוג הזה לאפשר 2 עיקריות במקום 1 / לא להציג מנה מסוימת / הערת אלרגנים"
            className="min-h-[112px] w-full rounded-2xl border border-[#eadfce] bg-white p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
          />
        </label>

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
    </div>
  );
}

function getCategoryIcon(name: string, index = 0) {
  const normalized = (name || "").toLowerCase();

  if (normalized.includes("קינוח") || normalized.includes("dessert")) return CakeSlice;
  if (normalized.includes("סלט") || normalized.includes("salad")) return Salad;
  if (normalized.includes("עיקר") || normalized.includes("main")) return Drumstick;
  if (normalized.includes("ראשונ") || normalized.includes("פתיח") || normalized.includes("starter")) return Soup;
  if (normalized.includes("בחר") || normalized.includes("מנה")) return ConciergeBell;

  const fallbackIcons = [Soup, Drumstick, Salad, CakeSlice, ConciergeBell];
  return fallbackIcons[index % fallbackIcons.length];
}

function PremiumHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/25 bg-white/14 p-4 text-right backdrop-blur">
      <div className="text-[11px] font-black text-white/70">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function StatusMini({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-3">
      <span className="text-xs font-black text-[#2b241c]">{label}</span>
      <span
        className={[
          "h-2.5 w-2.5 rounded-full",
          done ? "bg-emerald-500" : "bg-[#dccbb2]",
        ].join(" ")}
      />
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
  const diff =
    clampNumber(group.directSummary.actualServedQuantity) -
    clampNumber(group.directSummary.plannedQuantity);

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#e5dac8] bg-[#fffaf3] shadow-[0_10px_26px_rgba(47,35,20,0.055)]">
      <div className="border-b border-[#e8decd] bg-[linear-gradient(135deg,#fbf6ed,#f4eadc)] px-3 py-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_110px_110px_70px_145px_44px] xl:items-end">
          <button
            type="button"
            onClick={onToggle}
            className="group flex min-w-0 items-center gap-3 text-right"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#e2d5c2] bg-[#fffdf8] text-[#7b5d37] shadow-sm transition group-hover:bg-[#f8f0e4]">
              {isOpen ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-black tracking-tight text-[#2d251d]">
                {group.title}
              </span>
              <span className="mt-0.5 block text-[11px] font-bold leading-5 text-[#766754]">
                {group.dishes.length
                  ? `${group.dishes.length} מנות · עדכון מנה מסכם אוטומטית את הקטגוריה`
                  : "אין מנות שנבחרו · אפשר לעדכן כמות כללית"}
              </span>
            </span>
          </button>

          <LiveNumberInput
            label="מוערך"
            value={group.directSummary.plannedQuantity}
            onChange={(value) => onCategoryQuantityChange(group.id, "plannedQuantity", value)}
          />

          <LiveNumberInput
            label="בפועל"
            value={group.directSummary.actualServedQuantity}
            onChange={(value) => onCategoryQuantityChange(group.id, "actualServedQuantity", value)}
            highlighted
          />

          <GapBadge value={diff} />

          <div>
            <div className="mb-1 text-center text-[10px] font-black text-[#766754]">מהיר</div>
            <div className="flex items-center justify-center gap-1.5">
              <QuickButton onClick={() => onCategoryActualQuick(group.id, -1)} label="−" />
              <QuickButton onClick={() => onCategoryActualQuick(group.id, 1)} label="+" primary />
              <QuickButton onClick={() => onCategoryActualQuick(group.id, 10)} label="10+" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAddDish(group.id)}
            className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[#d8c6aa] bg-[#fffdf8] text-[#7b5d37] shadow-sm transition hover:bg-[#f7efe3]"
            title="הוספת מנה ידנית תחת הקטגוריה"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="bg-[#fffdf8] p-2">
          {group.dishes.length ? (
            <div className="overflow-x-auto rounded-[18px] border border-[#eadfce] bg-white">
              <table className="w-full min-w-[1120px] border-collapse text-right">
                <thead className="bg-[#fbf6ed] text-[11px] font-black text-[#766754]">
                  <tr>
                    <th className="border-b border-[#eadfce] px-3 py-2">מנה</th>
                    <th className="border-b border-[#eadfce] px-2 py-2">מוערך</th>
                    <th className="border-b border-[#eadfce] px-2 py-2">בפועל</th>
                    <th className="border-b border-[#eadfce] px-2 py-2">פער</th>
                    <th className="border-b border-[#eadfce] px-2 py-2">עדכון מהיר</th>
                    <th className="border-b border-[#eadfce] px-3 py-2">הערה</th>
                    <th className="border-b border-[#eadfce] px-2 py-2">מחיקה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1e8dc]">
                  {group.dishes.map((dish) => {
                    const dishDiff =
                      clampNumber(dish.actualServedQuantity) -
                      clampNumber(dish.plannedQuantity);

                    return (
                      <tr key={dish.id} className="align-middle hover:bg-[#fffaf3]">
                        <td className="w-[280px] px-3 py-2">
                          <input
                            value={dish.dishName}
                            onChange={(event) =>
                              onDishChange(group.id, dish.id, "dishName", event.target.value)
                            }
                            placeholder="שם מנה"
                            className="h-9 w-full rounded-[14px] border border-[#e5dac8] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#9d7b4e] focus:ring-2 focus:ring-[#9d7b4e]/10"
                          />
                        </td>

                        <td className="w-[105px] px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={dish.plannedQuantity}
                            onChange={(event) =>
                              onDishChange(group.id, dish.id, "plannedQuantity", event.target.value)
                            }
                            className="h-9 w-full rounded-[14px] border border-[#e5dac8] bg-[#fffdf8] px-2 text-center text-sm font-black text-[#2b241c] outline-none transition focus:border-[#9d7b4e] focus:ring-2 focus:ring-[#9d7b4e]/10"
                          />
                        </td>

                        <td className="w-[105px] px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={dish.actualServedQuantity}
                            onChange={(event) =>
                              onDishChange(group.id, dish.id, "actualServedQuantity", event.target.value)
                            }
                            className="h-9 w-full rounded-[14px] border border-[#d6c4a8] bg-[#f8f0e4] px-2 text-center text-sm font-black text-[#7b5d37] outline-none transition focus:border-[#9d7b4e] focus:ring-2 focus:ring-[#9d7b4e]/10"
                          />
                        </td>

                        <td className="w-[74px] px-2 py-2">
                          <GapBadge value={dishDiff} />
                        </td>

                        <td className="w-[155px] px-2 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <QuickButton onClick={() => onDishActualQuick(group.id, dish.id, -1)} label="−" />
                            <QuickButton onClick={() => onDishActualQuick(group.id, dish.id, 1)} label="+" primary />
                            <QuickButton onClick={() => onDishActualQuick(group.id, dish.id, 10)} label="10+" />
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <input
                            value={dish.notes}
                            onChange={(event) =>
                              onDishChange(group.id, dish.id, "notes", event.target.value)
                            }
                            placeholder="הערה קצרה למטבח"
                            className="h-9 w-full rounded-[14px] border border-[#e5dac8] bg-[#fffdf8] px-3 text-xs font-bold text-[#2b241c] outline-none transition focus:border-[#9d7b4e] focus:ring-2 focus:ring-[#9d7b4e]/10"
                          />
                        </td>

                        <td className="w-[58px] px-2 py-2">
                          <button
                            type="button"
                            onClick={() => onRemoveDish(group.id, dish.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-rose-100 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBox text="אין מנות תחת הקטגוריה הזאת. אפשר להשאיר כמות כללית או להוסיף מנה ידנית." />
          )}
        </div>
      ) : null}
    </article>
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
      <div className="text-sm font-black text-[#2b241c]">אפשרות עריכה לבעל האירוע</div>
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
          <div className="mt-1 text-xs font-bold leading-5">אחרי התאריך שהאולם הגדיר, בעל האירוע יראה את התפריט לצפייה בלבד.</div>
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
          <div className="mt-1 text-xs font-bold leading-5">אחרי שבעל האירוע שומר פעם אחת, הוא יוכל לראות את התפריט בלבד.</div>
        </button>
      </div>

      {isUntilDate ? (
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-black text-[#8a7b68]">ניתן לעדכן עד תאריך ושעה</span>
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
        "relative overflow-hidden rounded-[26px] border p-4 text-center shadow-[0_12px_30px_rgba(46,34,21,0.08)]",
        highlighted
          ? "border-[#cbb89b] bg-[linear-gradient(145deg,#f6ead9,#fffaf2)]"
          : "border-[#e5dac8] bg-[#fffdf8]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -left-8 -top-8 h-20 w-20 rounded-full bg-white/55 blur-2xl" />
      <div className="relative text-[11px] font-black tracking-wide text-[#7f705d]">{label}</div>
      <div
        className={[
          "relative mt-1 text-3xl font-black tracking-tight",
          danger ? "text-rose-700" : success ? "text-emerald-700" : highlighted ? "text-[#8b6334]" : "text-[#2b241c]",
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
      <span className="mb-1 block text-center text-[11px] font-black text-[#766754]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "h-12 w-full rounded-[20px] border px-3 text-center text-lg font-black outline-none transition focus:border-[#9d7b4e] focus:ring-4 focus:ring-[#9d7b4e]/10",
          highlighted
            ? "border-[#cbb89b] bg-[#f6ead9] text-[#8b6334]"
            : "border-[#e5dac8] bg-[#fffdf8] text-[#2b241c]",
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
        "flex h-9 min-w-9 items-center justify-center rounded-[16px] px-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
        primary
          ? "bg-[#6f5a42] text-white hover:bg-[#574633]"
          : "border border-[#d8c6aa] bg-[#fffdf8] text-[#7b5d37] hover:bg-[#f6ead9]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function GapBadge({ value }: { value: number }) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[11px] font-black text-[#766754]">פער</div>
      <span
        className={[
          "inline-flex min-w-[62px] justify-center rounded-full px-3 py-2 text-xs font-black shadow-sm",
          value > 0
            ? "bg-emerald-50 text-emerald-700"
            : value < 0
              ? "bg-rose-50 text-rose-700"
              : "bg-[#ece4d8] text-[#6f6252]",
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
    <div className="rounded-[22px] border border-[#e6dccb] bg-[#fffaf3] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="text-[11px] font-black text-[#7f705d]">{label}</div>
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
    <section className="overflow-hidden rounded-[34px] border border-[#e6dccb] bg-[#fbf6ed] p-0 shadow-[0_18px_45px_rgba(47,35,20,0.075)]">
      <div className="border-b border-[#e7dccb] bg-[linear-gradient(135deg,#f7efe3,#efe2d0)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[20px] border border-white/70 bg-[#fffdf8]/90 text-[#7b5d37] shadow-sm">
            {icon}
          </div>
          <h2 className="text-lg font-black text-[#2b241c]">{title}</h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
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
      <span className="mb-1 block text-xs font-black text-[#766754]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[18px] border border-[#e5dac8] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none transition placeholder:text-[#a79a8a] focus:border-[#9d7b4e] focus:ring-4 focus:ring-[#9d7b4e]/10"
      />
    </label>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#cab99e] bg-[#f8f0e4] p-5 text-center text-sm font-bold leading-6 text-[#766754]">
      {text}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700 shadow-sm">
      {text}
    </div>
  );
}
