import { create } from "zustand";

/* ============================================================
   CANVAS DEFAULTS (בלי לגעת בקנבס)
   אם הקנבס אצלך בגודל אחר — אפשר לשנות פה בלבד.
============================================================ */
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1600;

/* ============================================================
   TYPES — FULL CANVA SUPPORT
============================================================ */
export interface EditorObject {
  id: string;
  type: "text" | "rect" | "circle" | "image" | "lottie";

  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;

  fill?: string;

  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;

  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  radius?: number;

  url?: string;
  image?: HTMLImageElement | null;
  removeBackground?: boolean;

  lottieData?: any;

  /** ⭐ marker לרקע */
  isBackground?: boolean;

  [key: string]: any;
}

/* ============================================================
   STATE TYPES
============================================================ */
interface EditorState {
  objects: EditorObject[];
  selectedId: string | null;

  /** legacy background string (נשמור תאימות) */
  background: string | null;

  /** ⭐ חדש: מזהה אובייקט הרקע בקנבס */
  backgroundObjectId: string | null;

  scale: number;

  setSelected: (id: string | null) => void;
  updateObject: (id: string, data: Partial<EditorObject>) => void;

  addText: () => void;
  addRect: () => void;
  addCircle: () => void;

  addImage: (data: {
    url: string;
    width?: number;
    height?: number;
    removeBackground?: boolean;
  }) => void;

  addLottie: (data: any) => void;

  /** ⭐ REQUIRED FOR SHAPES TAB */
  addObject: (obj: EditorObject) => void;

  removeObject: (id: string) => void;

  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  /**
   * ⭐ שדרוג:
   * במקום רק לשמור background string,
   * יוסיף תמונה על הקנבס בגודל מלא + ניתן לעריכה.
   */
  setBackground: (url: string | null) => void;

  setScale: (scale: number) => void;
}

/* ============================================================
   ZUSTAND STORE
============================================================ */
export const useEditorStore = create<EditorState>((set, get) => ({
  objects: [],
  selectedId: null,

  background: null,
  backgroundObjectId: null,

  scale: 1,

  setSelected: (id) => set({ selectedId: id }),

  updateObject: (id, data) =>
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, ...data } : o)),
    })),

  addText: () =>
    set((state) => ({
      objects: [
        ...state.objects,
        {
          id: `text-${Date.now()}`,
          type: "text",
          x: 150,
          y: 150,
          text: "טקסט חדש",
          fontSize: 40,
          fontFamily: "Assistant",
          fontWeight: "normal",
          italic: false,
          underline: false,
          align: "center",
          fill: "#000",
          letterSpacing: 0,
          lineHeight: 1.1,
          shadowColor: "transparent",
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        },
      ],
    })),

  addRect: () =>
    set((state) => ({
      objects: [
        ...state.objects,
        {
          id: `rect-${Date.now()}`,
          type: "rect",
          x: 100,
          y: 100,
          width: 250,
          height: 150,
          fill: "#d1d5db",
        },
      ],
    })),

  addCircle: () =>
    set((state) => ({
      objects: [
        ...state.objects,
        {
          id: `circle-${Date.now()}`,
          type: "circle",
          x: 200,
          y: 200,
          radius: 80,
          fill: "#c0c0c0",
        },
      ],
    })),

  /* ============================================================
      ADD IMAGE — fully typed + matches ElementsTab
  ============================================================ */
  addImage: ({ url, width = 200, height = 200, removeBackground = false }) => {
    const id = `img-${Date.now()}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      set((state) => ({
        objects: [
          ...state.objects,
          {
            id,
            type: "image",
            x: 100,
            y: 100,
            width,
            height,
            url,
            image: img,
            removeBackground,
          },
        ],
      }));
    };
  },

  addLottie: (lottieData) =>
    set((state) => ({
      objects: [
        ...state.objects,
        {
          id: `lottie-${Date.now()}`,
          type: "lottie",
          x: 100,
          y: 100,
          width: 300,
          height: 300,
          lottieData,
        },
      ],
    })),

  /* ============================================================
      ⭐ REQUIRED FOR SHAPES TAB
  ============================================================ */
  addObject: (obj) =>
    set((state) => ({
      objects: [...state.objects, obj],
    })),

  removeObject: (id) =>
    set((state) => {
      const isBg = state.backgroundObjectId === id;

      return {
        objects: state.objects.filter((o) => o.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        backgroundObjectId: isBg ? null : state.backgroundObjectId,
        background: isBg ? null : state.background,
      };
    }),

  bringToFront: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;

    // ⭐ לא מרים רקע מעל הכל
    if (obj.isBackground) return;

    set({ objects: [...get().objects.filter((o) => o.id !== id), obj] });
  },

  sendToBack: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;

    set({ objects: [obj, ...get().objects.filter((o) => o.id !== id)] });
  },

  /* ============================================================
      ✅ NEW BEHAVIOR — setBackground
      - מוסיף אובייקט תמונה בגודל מלא
      - ניתן לעריכה/הקטנה
      - נשמר מאחור
      - מבטל background string כדי לא ליצור כפילות בקנבס
  ============================================================ */
  setBackground: (url) => {
    const { backgroundObjectId } = get();

    // אם מבקשים להסיר רקע
    if (!url) {
      set((state) => ({
        background: null,
        backgroundObjectId: null,
        objects: backgroundObjectId
          ? state.objects.filter((o) => o.id !== backgroundObjectId)
          : state.objects,
        selectedId:
          state.selectedId === backgroundObjectId ? null : state.selectedId,
      }));
      return;
    }

    const id = `bg-${Date.now()}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      set((state) => {
        // מסירים רקע קודם אם היה
        const withoutOldBg = backgroundObjectId
          ? state.objects.filter((o) => o.id !== backgroundObjectId)
          : state.objects;

        const bgObj: EditorObject = {
          id,
          type: "image",
          x: 0,
          y: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          url,
          image: img,
          isBackground: true,
        };

        return {
          // ⭐ רקע תמיד ראשון = מאחור
          objects: [bgObj, ...withoutOldBg.filter((o) => !o.isBackground)],
          backgroundObjectId: id,
          background: null, // חשוב: לא לצייר רקע כפול בקנבס
          selectedId: id,   // כדי שתוכלי לערוך מיד
        };
      });
    };
  },

  setScale: (scale) => set({ scale }),
}));
