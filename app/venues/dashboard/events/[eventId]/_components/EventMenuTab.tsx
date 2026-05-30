"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Copy,
  Edit3,
  FileText,
  Folder,
  Home,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  Utensils,
  Wallet,
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
    <PremiumEventMenuOverview
      menuError={menuError}
      assignedMenu={assignedMenu}
      eventId={eventId}
      hallId={hallId}
      publicLink={publicLink}
      selectedDishGroups={selectedDishGroups}
      liveGroups={liveGroups}
      totals={totals}
      totalGap={totalGap}
      totalSpecial={totalSpecial}
      kitchenReportStatus={kitchenReportStatus}
      menuSaving={menuSaving}
      onGoLive={() => setMenuView("live")}
      onSendToCouple={onSendToCouple}
      onSaveChanges={onSaveChanges}
      onUpdateEventNote={onUpdateEventNote}
      onUpdateCategory={onUpdateCategory}
      onUpdateSelectionPolicy={onUpdateSelectionPolicy}
    />
  );
}

function PremiumEventMenuOverview({
  menuError,
  assignedMenu,
  eventId,
  hallId,
  publicLink,
  selectedDishGroups,
  liveGroups,
  totals,
  totalGap,
  totalSpecial,
  kitchenReportStatus,
  menuSaving,
  onGoLive,
  onSendToCouple,
  onSaveChanges,
  onUpdateEventNote,
  onUpdateCategory,
  onUpdateSelectionPolicy,
}: {
  menuError: string;
  assignedMenu: AssignedMenu;
  eventId: string;
  hallId: string;
  publicLink: string;
  selectedDishGroups: Record<string, NonNullable<AssignedMenu["selectedDishes"]>>;
  liveGroups: LiveCategory[];
  totals: { estimated: number; actual: number };
  totalGap: number;
  totalSpecial: number;
  kitchenReportStatus: KitchenReportStatus;
  menuSaving: boolean;
  onGoLive: () => void;
  onSendToCouple: () => void;
  onSaveChanges: () => void;
  onUpdateEventNote: (value: string) => void;
  onUpdateCategory: (
    categoryId: string,
    field: "eventChoices" | "eventNote",
    value: string
  ) => void;
  onUpdateSelectionPolicy: (
    patch: Partial<Pick<AssignedMenu, "selectionEditMode" | "selectionEditableUntil">>
  ) => void;
}) {
  const selectedDishes = assignedMenu.selectedDishes || [];
  const selectedCategories = Object.keys(selectedDishGroups);
  const categoriesCount =
    assignedMenu.categoryOverrides.length || selectedCategories.length || liveGroups.length;
  const totalChoicesAllowed = assignedMenu.categoryOverrides.reduce(
    (sum, category) => sum + clampNumber(category.eventMaxChoices),
    0
  );

  const statusItems = [
    { label: "תפריט נבחר", helper: assignedMenu.name, done: true },
    { label: "קישור נשלח", helper: "SMS / קישור אישי", done: assignedMenu.sentToCouple },
    { label: "בחירת מנות", helper: "בחירת בעל האירוע", done: assignedMenu.coupleSelected },
    { label: "לייב מטבח", helper: "כמויות בפועל", done: liveGroups.length > 0 },
    { label: "דוח מטבח", helper: "סגירה בסוף אירוע", done: kitchenReportStatus === "submitted" },
  ];

  const completedTasks = statusItems.filter((item) => item.done).length;
  const progress = Math.round((completedTasks / statusItems.length) * 100);
  const selectedDate = assignedMenu.submittedAt || assignedMenu.selectedAt || assignedMenu.updatedAt;
  const customerName = assignedMenu.submittedByName || "לא הוזן";
  const customerPhone = assignedMenu.submittedByPhone || "לא הוזן";
  const firstLetter = customerName !== "לא הוזן" ? customerName.charAt(0) : "I";

  const visibleDishes = selectedDishes.length
    ? selectedDishes.slice(0, 6)
    : assignedMenu.categoryOverrides.slice(0, 6).map((category) => ({
        categoryId: category.id,
        categoryTitle: category.name,
        dishId: category.id,
        dishName: `${category.eventMaxChoices || category.originalMaxChoices || 0} בחירות מתוך ${
          category.dishesCount || 0
        } מנות`,
      }));

  const visibleQuantityGroups = liveGroups.length
    ? liveGroups.slice(0, 4)
    : assignedMenu.categoryOverrides.slice(0, 4).map((category) => ({
        id: category.id,
        title: category.name,
        subtitle: "ממתין לבחירת מנות",
        directSummary: {
          id: categorySummaryId(category.id),
          dishId: CATEGORY_SUMMARY_DISH_ID,
          categoryId: category.id,
          categoryTitle: category.name,
          dishName: category.name,
          plannedQuantity: 0,
          actualServedQuantity: 0,
          notes: "",
        },
        dishes: [],
      }));

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      alert("הקישור הועתק");
    } catch {
      alert("לא הצלחתי להעתיק אוטומטית");
    }
  };

  return (
    <div dir="rtl" className="space-y-5">
      {menuError && <ErrorBox text={menuError} />}

      <section className="relative overflow-hidden rounded-[42px] border border-[#e8ddcd] bg-[#f8f4ed] p-4 shadow-[0_24px_70px_rgba(51,39,26,0.08)] lg:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_18%_0%,rgba(218,193,156,0.26),transparent_34%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.9),transparent_32%)]" />

        <div className="relative mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#e1cfb2] bg-white/80 px-3 py-1 text-xs font-black text-[#9a7245] shadow-sm backdrop-blur">
              <Sparkles size={14} />
              סקירת אירוע · Invistimo
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#221b15] lg:text-4xl">
              ניהול תפריט אירוע
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-[#857665]">
              <span>{assignedMenu.name}</span>
              <span className="h-1 w-1 rounded-full bg-[#c7b69f]" />
              <span>{selectedDate ? formatDateTime(selectedDate) : "טרם נשמרה בחירת מנות"}</span>
              <span className="h-1 w-1 rounded-full bg-[#c7b69f]" />
              <span>{eventId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoLive}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[#d6bc91] bg-white px-5 text-sm font-black text-[#9a7245] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff8eb]"
            >
              <Plus size={17} />
              פעולה מהירה
            </button>
            <button
              type="button"
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#e5dac8] bg-white text-[#6f6252] shadow-sm"
              aria-label="התראות"
            >
              <Bell size={18} />
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#b98121]" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#eadfce] bg-[linear-gradient(135deg,#fff,#eadbc7)] text-sm font-black text-[#6f4d2d] shadow-sm">
              {firstLetter}
            </div>
          </div>
        </div>

        <div className="relative grid gap-3 rounded-[26px] border border-[#e4d8c6] bg-white/88 p-3 shadow-[0_18px_45px_rgba(61,47,31,0.07)] backdrop-blur md:grid-cols-2 xl:grid-cols-[1.25fr_repeat(4,1fr)]">
          <div className="flex items-center gap-4 rounded-[22px] bg-[#fbf6ed] p-4">
            <PremiumProgressCircle value={progress} />
            <div>
              <div className="text-sm font-black text-[#2b241c]">התקדמות כללית</div>
              <div className="mt-1 text-xs font-bold leading-5 text-[#857665]">
                {completedTasks} מתוך {statusItems.length} שלבים הושלמו
              </div>
              <button type="button" className="mt-2 text-xs font-black text-[#a47738]">
                צפייה בפרטי ההתקדמות
              </button>
            </div>
          </div>

          <PremiumKpi icon={<Utensils size={17} />} value={`${categoriesCount}`} label="קטגוריות תפריט" />
          <PremiumKpi icon={<ClipboardList size={17} />} value={`${selectedDishes.length}`} label="מנות שנבחרו" />
          <PremiumKpi icon={<Users size={17} />} value={`${totalChoicesAllowed || "—"}`} label="בחירות מותרות" />
          <PremiumKpi icon={<ShieldCheck size={17} />} value={`${totalSpecial}`} label="מנות מיוחדות" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)_335px]" dir="rtl">
        <aside className="space-y-5">
          <PremiumPanel className="sticky top-4" bodyClassName="p-4">
            <div className="mb-5 text-center">
              <div className="text-4xl font-serif text-[#33251c]">Invistimo</div>
              <div className="mt-1 text-[11px] font-black tracking-[0.24em] text-[#b18a57]">
                EVENT SUITE
              </div>
            </div>

            <div className="space-y-1.5">
              <PremiumNavItem icon={<Home size={16} />} label="סקירת אירוע" active />
              <PremiumNavItem icon={<FileText size={16} />} label="פרטי האירוע" />
              <PremiumNavItem icon={<Utensils size={16} />} label="תפריט & הגשה" active />
              <PremiumNavItem icon={<Users size={16} />} label="האורחים שלי" />
              <PremiumNavItem icon={<Wallet size={16} />} label="תשלומים" />
              <PremiumNavItem icon={<MessageCircle size={16} />} label="הודעות & עדכונים" />
              <PremiumNavItem icon={<Folder size={16} />} label="קבצים" />
              <PremiumNavItem icon={<Settings size={16} />} label="הגדרות" />
            </div>
          </PremiumPanel>

          <PremiumPanel title="משימות אחרונות" icon={<CheckCircle2 size={18} />} bodyClassName="p-4">
            <div className="space-y-3">
              {statusItems.map((item) => (
                <PremiumStatusMini key={item.label} label={item.label} helper={item.helper} done={item.done} />
              ))}
            </div>
            <button
              type="button"
              onClick={onSaveChanges}
              disabled={menuSaving}
              className="mt-4 h-11 w-full rounded-[18px] border border-[#d8c2a0] bg-[#fffaf3] text-sm font-black text-[#9a7245] transition hover:bg-[#fff4dc] disabled:opacity-60"
            >
              {menuSaving ? "שומר..." : "שמירת כל השינויים"}
            </button>
          </PremiumPanel>
        </aside>

        <main className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.55fr]">
            <PremiumPanel title="קישור אישי לאירוע" icon={<Link2 size={18} />}>
              <p className="text-sm font-bold leading-7 text-[#857665]">
                שתפו את עמוד בחירת המנות עם בעל האירוע בצורה נקייה ומקצועית.
              </p>

              <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-[#eadfce] bg-[#fffdf8] p-2">
                <button
                  type="button"
                  onClick={copyPublicLink}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f3eadc] text-[#7b5d37]"
                  aria-label="העתקת קישור"
                >
                  <Copy size={16} />
                </button>
                <div className="min-w-0 flex-1 break-all text-left text-xs font-black leading-5 text-[#2b241c]" dir="ltr">
                  {publicLink}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(publicLink)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[18px] border border-[#e7dccb] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5"
                >
                  <MessageCircle className="mx-auto text-emerald-600" size={18} />
                  <span className="mt-2 block text-[11px] font-black text-[#6f6252]">וואטסאפ</span>
                </a>
                <button
                  type="button"
                  onClick={copyPublicLink}
                  className="group rounded-[18px] border border-[#e7dccb] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5"
                >
                  <Link2 className="mx-auto text-[#7b5d37]" size={18} />
                  <span className="mt-2 block text-[11px] font-black text-[#6f6252]">העתק</span>
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent("בחירת מנות לאירוע")}&body=${encodeURIComponent(publicLink)}`}
                  className="group rounded-[18px] border border-[#e7dccb] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5"
                >
                  <Mail className="mx-auto text-[#7b5d37]" size={18} />
                  <span className="mt-2 block text-[11px] font-black text-[#6f6252]">אימייל</span>
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({ title: "בחירת מנות", url: publicLink });
                      return;
                    }
                    await copyPublicLink();
                  }}
                  className="group rounded-[18px] border border-[#e7dccb] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5"
                >
                  <Share2 className="mx-auto text-[#7b5d37]" size={18} />
                  <span className="mt-2 block text-[11px] font-black text-[#6f6252]">שיתוף</span>
                </button>
              </div>
            </PremiumPanel>

            <div className="relative min-h-[260px] overflow-hidden rounded-[30px] border border-[#ddcfbc] bg-[linear-gradient(135deg,rgba(51,37,28,0.92),rgba(111,86,61,0.48)),radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.34),transparent_18%),linear-gradient(135deg,#d6c0a2,#866b4d)] p-6 text-white shadow-[0_22px_55px_rgba(51,39,26,0.16)]">
              <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/86 px-3 py-1 text-xs font-black text-[#6f4d2d]">
                  <Sparkles size={14} />
                  אירוע פעיל
                </div>

                <div className="mt-10 max-w-xl">
                  <h2 className="text-4xl font-black tracking-tight">{assignedMenu.name}</h2>
                  <p className="mt-3 text-base font-bold leading-8 text-white/86">
                    מרכז ניהול אלגנטי לבחירת מנות, התאמות לאולם, הערות מטבח וניהול לייב בזמן אמת.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onGoLive}
                      className="h-11 rounded-full border border-white/40 bg-white/14 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/24"
                    >
                      ניהול לייב באירוע
                    </button>
                    <Link
                      href={assignedMenu.publicLink || `/menus/choose/${assignedMenu.publicToken || eventId}`}
                      target="_blank"
                      className="h-11 rounded-full bg-white px-5 py-3 text-sm font-black text-[#4d3b2b] transition hover:bg-[#fff8eb]"
                    >
                      צפייה בפרטי האירוע
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <PremiumPanel title="הערות לאירוע" icon={<ClipboardList size={18} />} badge="פנימי">
              <textarea
                value={assignedMenu.eventNote || ""}
                onChange={(event) => onUpdateEventNote(event.target.value)}
                placeholder="לדוגמה: לזוג הזה לאפשר 2 עיקריות במקום 1 / לא להציג מנה מסוימת / הערת אלרגנים"
                className="min-h-[130px] w-full resize-none rounded-[22px] border border-[#eadfce] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[#2b241c] outline-none transition placeholder:text-[#a99b87] focus:border-[#b98121] focus:ring-4 focus:ring-[#b98121]/10"
              />
              <button
                type="button"
                onClick={onSaveChanges}
                disabled={menuSaving}
                className="mt-3 h-10 rounded-full border border-[#d8c2a0] bg-white px-5 text-xs font-black text-[#9a7245] disabled:opacity-60"
              >
                {menuSaving ? "שומר..." : "שמור הערה"}
              </button>
            </PremiumPanel>

            <PremiumPanel title="הערות בעל האירוע" icon={<Building2 size={18} />} badge="לקוח">
              {assignedMenu.customerNote ? (
                <p className="min-h-[130px] rounded-[22px] border border-[#eadfce] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[#2b241c]">
                  {assignedMenu.customerNote}
                </p>
              ) : (
                <div className="min-h-[130px] rounded-[22px] border border-dashed border-[#dac8ad] bg-[#fffaf3] p-4 text-sm font-bold leading-7 text-[#857665]">
                  עדיין אין הערות מבעל האירוע. כשהוא ישמור בחירת מנות, ההערות יופיעו כאן.
                </div>
              )}
              <div className="mt-3 text-xs font-bold text-[#9a8a78]">
                עודכן לאחרונה: {assignedMenu.updatedAt ? formatDateTime(assignedMenu.updatedAt) : "לא הוגדר"}
              </div>
            </PremiumPanel>
          </div>

          <PremiumPanel
            title="תפריט נבחר"
            icon={<Utensils size={18} />}
            action={
              <button
                type="button"
                onClick={onGoLive}
                className="rounded-full border border-[#d8c2a0] bg-[#fff8eb] px-4 py-2 text-xs font-black text-[#9a7245]"
              >
                צפייה מלאה בתפריט
              </button>
            }
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {(assignedMenu.categoryOverrides.length
                ? assignedMenu.categoryOverrides.slice(0, 5)
                : selectedCategories.slice(0, 5).map((name, index) => ({ id: name, name, eventMaxChoices: index + 1 }))
              ).map((category, index) => (
                <span
                  key={category.id || category.name}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black",
                    index === 0
                      ? "border-[#ead7ba] bg-[#f4eadc] text-[#7b5d37]"
                      : "border-[#eadfce] bg-white text-[#857665]",
                  ].join(" ")}
                >
                  <Utensils size={13} />
                  {category.name}
                </span>
              ))}
            </div>

            {visibleDishes.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {visibleDishes.map((dish, index) => (
                  <PremiumDishCard
                    key={`${dish.categoryId}-${dish.dishId}-${index}`}
                    title={dish.dishName}
                    subtitle={dish.categoryTitle}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyBox text="עדיין אין מנות להצגה בתפריט הזה." />
            )}

            {selectedDishes.length > 6 ? (
              <button type="button" onClick={onGoLive} className="mt-4 w-full text-center text-xs font-black text-[#a47738]">
                הצג עוד {selectedDishes.length - 6} מנות
              </button>
            ) : null}
          </PremiumPanel>

          <PremiumPanel title="בחירות וכמויות" icon={<Utensils size={18} />}>
            {visibleQuantityGroups.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {visibleQuantityGroups.map((group) => (
                  <PremiumQuantityTile key={group.id} group={group} />
                ))}
              </div>
            ) : (
              <EmptyBox text="אין עדיין קטגוריות לניהול כמויות." />
            )}

            <button
              type="button"
              onClick={onGoLive}
              className="mt-5 h-12 w-full rounded-[20px] bg-[linear-gradient(135deg,#f3eadc,#fff8eb)] text-sm font-black text-[#8b6334] shadow-inner transition hover:bg-[#fff4dc]"
            >
              עדכון כמויות בלייב
            </button>
          </PremiumPanel>

          <PremiumPanel title="התאמות בחירה לאירוע הזה" icon={<Edit3 size={18} />}>
            <div className="mb-4 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-4 text-sm font-bold leading-7 text-[#7f705d]">
              כאן האולם משנה את כמות הבחירות רק עבור האירוע הזה. בעל האירוע מוגבל לפי מה שהוגדר כאן, אבל האולם יכול לערוך תמיד מהדשבורד.
            </div>

            {assignedMenu.categoryOverrides.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {assignedMenu.categoryOverrides.map((category) => (
                  <div key={category.id} className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-[#2b241c]">{category.name}</div>
                        <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                          במקור: בחירה {category.originalMaxChoices} מתוך {category.dishesCount || "המוגדרות"}
                        </div>
                      </div>
                      <div className="w-24">
                        <InputEdit
                          label="כמה"
                          type="number"
                          value={String(category.eventMaxChoices)}
                          onChange={(value) => onUpdateCategory(category.id, "eventChoices", value)}
                        />
                      </div>
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs font-black text-[#8a7b68]">הערה לקטגוריה</span>
                      <input
                        value={category.eventNote}
                        onChange={(event) => onUpdateCategory(category.id, "eventNote", event.target.value)}
                        placeholder="הערה שתישמר רק לאירוע הזה"
                        className="h-11 w-full rounded-[18px] border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBox text="לתפריט הזה אין קטגוריות עם חוקי בחירה." />
            )}

            <button
              type="button"
              onClick={onSaveChanges}
              disabled={menuSaving}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-[#5c4936] text-sm font-black text-white transition hover:bg-[#473829] disabled:opacity-60"
            >
              <Save size={16} />
              {menuSaving ? "שומר..." : "שמירת התאמות תפריט"}
            </button>
          </PremiumPanel>
        </main>

        <aside className="space-y-5">
          <PremiumPanel title="סטטוס תפריט" icon={<CheckCircle2 size={18} />}>
            <div className="space-y-3">
              {statusItems.map((item) => (
                <StatusLine key={item.label} label={item.label} done={item.done} />
              ))}
            </div>
          </PremiumPanel>

          <PremiumPanel title="פרטי לקוח" icon={<User size={18} />}>
            <div className="rounded-[22px] border border-[#eadfce] bg-[#fffdf8] p-4">
              <PremiumField icon={<User size={14} />} label="שם ממלא" value={customerName} />
              <PremiumField icon={<Phone size={14} />} label="טלפון" value={customerPhone} />
              <PremiumField icon={<Mail size={14} />} label="אימייל" value="לא הוזן" />
              <PremiumField icon={<Building2 size={14} />} label="מקור" value="Event" />
            </div>
          </PremiumPanel>

          <PremiumPanel title="סיכום תפעולי" icon={<Wallet size={18} />}>
            <div className="space-y-2">
              <PremiumFinanceRow label="כמות מוערכת" value={`${totals.estimated} מנות`} />
              <PremiumFinanceRow label="כמות בפועל" value={`${totals.actual} מנות`} />
              <PremiumFinanceRow label="פער" value={`${totalGap > 0 ? "+" : ""}${totalGap}`} emphasized />
              <PremiumFinanceRow label="סטטוס דוח" value={kitchenReportStatus === "submitted" ? "נסגר" : "טיוטה"} />
            </div>
            <button
              type="button"
              onClick={onGoLive}
              className="mt-4 h-11 w-full rounded-[18px] bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              צפייה בדוח לייב
            </button>
          </PremiumPanel>

          <PremiumPanel title="מדיניות עריכה" icon={<ShieldCheck size={18} />} bodyClassName="p-0">
            <div className="p-4">
              <MenuEditPolicyBox
                selectionEditMode={assignedMenu.selectionEditMode || "untilDate"}
                selectionEditableUntil={assignedMenu.selectionEditableUntil || ""}
                lockedAt={assignedMenu.lockedAt || null}
                lockedReason={assignedMenu.lockedReason || ""}
                onChangeMode={(value) => onUpdateSelectionPolicy({ selectionEditMode: value })}
                onChangeEditableUntil={(value) => onUpdateSelectionPolicy({ selectionEditableUntil: value })}
              />
            </div>
          </PremiumPanel>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#d9bd83] bg-[#fff8eb] text-xs font-black text-[#9f6f1a]"
            >
              <Send size={15} />
              שליחה
            </button>
            <Link
              href={hallId ? `/venues/dashboard/halls/${hallId}/menus` : "/venues/dashboard"}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#eadfce] bg-white text-xs font-black text-[#6f6252]"
            >
              <Utensils size={15} />
              תפריטי אולם
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

function PremiumPanel({
  title,
  icon,
  badge,
  action,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: string;
  icon?: React.ReactNode;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-[30px] border border-[#e6dccb] bg-white/86 shadow-[0_18px_45px_rgba(47,35,20,0.065)] backdrop-blur",
        className,
      ].join(" ")}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#eee4d7] bg-[linear-gradient(135deg,#fffdf8,#f7efe3)] px-5 py-4">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-[#eadfce] bg-white text-[#8b6334] shadow-sm">
                {icon}
              </div>
            ) : null}
            <h2 className="text-lg font-black text-[#2b241c]">{title}</h2>
            {badge ? (
              <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-[11px] font-black text-[#a47738]">
                {badge}
              </span>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function PremiumProgressCircle({ value }: { value: number }) {
  return (
    <div
      className="grid h-20 w-20 shrink-0 place-items-center rounded-full p-2 shadow-inner"
      style={{ background: `conic-gradient(#b58a52 ${value * 3.6}deg, #eee4d7 0deg)` }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white text-lg font-black text-[#2b241c]">
        {value}%
      </div>
    </div>
  );
}

function PremiumKpi({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-h-[94px] items-center justify-between gap-3 rounded-[22px] border border-[#eee4d7] bg-white px-4 shadow-sm">
      <div>
        <div className="text-2xl font-black tracking-tight text-[#2b241c]">{value}</div>
        <div className="mt-1 text-xs font-black text-[#857665]">{label}</div>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[#f4eadc] text-[#8b6334]">
        {icon}
      </div>
    </div>
  );
}

function PremiumNavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={[
        "flex h-12 items-center justify-between rounded-[18px] px-4 text-sm font-black transition",
        active ? "bg-[#f1e5d4] text-[#9a7245]" : "text-[#6f6252] hover:bg-[#fff8eb]",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="text-[#9a7245]">{icon}</span>
    </div>
  );
}

function PremiumStatusMini({ label, helper, done }: { label: string; helper: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-[#fffdf8] p-3">
      <span
        className={[
          "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
          done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#eadfce] bg-white text-[#c4aa80]",
        ].join(" ")}
      >
        {done ? <Check size={15} /> : <span className="h-2.5 w-2.5 rounded-full bg-current opacity-50" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#2b241c]">{label}</span>
        <span className="block truncate text-[11px] font-bold text-[#857665]">{helper}</span>
      </span>
    </div>
  );
}

function PremiumDishCard({ title, subtitle, index }: { title: string; subtitle: string; index: number }) {
  const gradients = [
    "from-[#7b5d37] via-[#c3a171] to-[#fff0c9]",
    "from-[#dec7a7] via-[#fff6df] to-[#b98121]",
    "from-[#f5d45b] via-[#fff7c6] to-[#c69b43]",
    "from-[#4f6345] via-[#c7d5bd] to-[#f7efe3]",
    "from-[#8b5e4d] via-[#e5c7b8] to-[#fff6ef]",
    "from-[#4d5664] via-[#bbc3cf] to-[#fff]",
  ];

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#eadfce] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(47,35,20,0.09)]">
      <div className={`h-24 bg-gradient-to-br ${gradients[index % gradients.length]} p-3`}>
        <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-white/72 text-[#6f4d2d] shadow-sm backdrop-blur">
          <Utensils size={18} />
        </div>
      </div>
      <div className="p-4">
        <div className="line-clamp-1 text-sm font-black text-[#2b241c]">{title}</div>
        <div className="mt-1 text-xs font-bold text-[#857665]">{subtitle}</div>
      </div>
    </article>
  );
}

function PremiumQuantityTile({ group }: { group: LiveCategory }) {
  const planned = clampNumber(group.directSummary.plannedQuantity);
  const actual = clampNumber(group.directSummary.actualServedQuantity);

  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4 text-center shadow-sm">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-[18px] bg-[#f4eadc] text-[#8b6334]">
        <Utensils size={18} />
      </div>
      <div className="mt-3 text-base font-black text-[#2b241c]">{group.title}</div>
      <div className="mt-2 text-xs font-bold text-[#857665]">{group.dishes.length || "—"} מנות</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] bg-white p-2">
          <div className="text-[10px] font-black text-[#857665]">מתוכנן</div>
          <div className="text-sm font-black text-[#2b241c]">{planned}</div>
        </div>
        <div className="rounded-[16px] bg-[#f4eadc] p-2">
          <div className="text-[10px] font-black text-[#857665]">בפועל</div>
          <div className="text-sm font-black text-[#8b6334]">{actual}</div>
        </div>
      </div>
    </div>
  );
}

function PremiumField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eee4d7] py-3 last:border-b-0">
      <div className="flex items-center gap-2 text-xs font-black text-[#857665]">
        <span className="text-[#9a7245]">{icon}</span>
        {label}
      </div>
      <div className="max-w-[170px] truncate text-sm font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function PremiumFinanceRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#eee4d7] bg-[#fffdf8] px-3 py-3">
      <span className="text-xs font-black text-[#857665]">{label}</span>
      <span className={["text-sm font-black", emphasized ? "text-[#b98121]" : "text-[#2b241c]"].join(" ")}>{value}</span>
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
