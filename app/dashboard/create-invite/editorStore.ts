import { create } from "zustand";

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

  [key: string]: any;
}

/* ============================================================
   STATE TYPES
============================================================ */
interface EditorState {
  objects: EditorObject[];
  selectedId: string | null;

  background: string | null;
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
    set((state) => ({
      objects: state.objects.filter((o) => o.id !== id),
      selectedId: null,
    })),

  bringToFront: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;
    set({ objects: [...get().objects.filter((o) => o.id !== id), obj] });
  },

  sendToBack: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;
    set({ objects: [obj, ...get().objects.filter((o) => o.id !== id)] });
  },

  setBackground: (url) => set({ background: url }),

  setScale: (scale) => set({ scale }),
}));
