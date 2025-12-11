import { create } from "zustand";

/* ============================================================
   CANVAS DEFAULTS
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
  image?: HTMLImageElement | HTMLVideoElement | null;
  removeBackground?: boolean;

  lottieData?: any;

  isBackground?: boolean;
  isAnimated?: boolean;

  [key: string]: any;
}

/* ============================================================
   STATE TYPES
============================================================ */
interface EditorState {
  objects: EditorObject[];
  selectedId: string | null;

  background: string | null;
  backgroundObjectId: string | null;

  scale: number;

  setSelected: (id: string | null) => void;
  updateObject: (id: string, data: Partial<EditorObject>) => void;

  /** ⭐ הפונקציה שחסרה לך — טעינת אובייקטים מהדאטהבייס */
  setObjects: (objs: EditorObject[]) => void;

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

  addObject: (obj: EditorObject) => void;

  addLottieFromUrl: (url: string) => Promise<void>;

  addAnimatedAsset: (item: {
    name: string;
    url: string;
    format?: string;
    width?: number;
    height?: number;
  }) => void;

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
  backgroundObjectId: null,

  scale: 1,

  setSelected: (id) => set({ selectedId: id }),

  /** ⭐⭐ הפונקציה החדשה — טעינת כל רשימת האובייקטים (מהשרת) ⭐⭐ */
  setObjects: (objs) =>
    set(() => ({
      objects: objs,
      selectedId: null,
    })),

  updateObject: (id, data) =>
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? { ...o, ...data } : o
      ),
    })),

  /* ============================================================
      ADD TEXT
  ============================================================ */
  addText: () =>
  set((state) => {
    const centerX = CANVAS_WIDTH / 2;
    const startY = 300;

    return {
      objects: [
        ...state.objects,
        {
          id: `text-${Date.now()}`,
          type: "text",
          x: centerX,
          y: startY,
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

          // ⭐ חשוב — שהטקסט יידבק למרכז
          offsetX: 0,
        },
      ],
    };
  }),


  /* ============================================================
      ADD RECT
  ============================================================ */
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

  /* ============================================================
      ADD CIRCLE
  ============================================================ */
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
      ADD IMAGE
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

  /* ============================================================
      ADD LOTTIE
  ============================================================ */
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
      ADD OBJECT (GENERIC)
  ============================================================ */
  addObject: (obj) =>
    set((state) => ({
      objects: [...state.objects, obj],
    })),

  /* ============================================================
      LOTTIE FROM URL
  ============================================================ */
  addLottieFromUrl: async (url) => {
    const res = await fetch(url);
    const json = await res.json();
    get().addLottie(json);
  },

  /* ============================================================
      ADD ANIMATED FILE (GIF / WEBP / MP4 / JSON)
  ============================================================ */
  addAnimatedAsset: (item) => {
    const cleanUrl = item.url.split("?")[0];
    const format = (item.format || cleanUrl.split(".").pop() || "").toLowerCase();
    const width = item.width ?? 240;
    const height = item.height ?? 240;

    // JSON → Lottie
    if (format === "json") {
      get().addLottieFromUrl(item.url);
      return;
    }

    // MP4 / WEBM → video element
    if (format === "mp4" || format === "webm") {
      const id = `anim-${Date.now()}`;
      const video = document.createElement("video");
      video.src = item.url;
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const onReady = () => {
        video.removeEventListener("canplay", onReady);
        video.play().catch(() => {});

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
              url: item.url,
              image: video,
              isAnimated: true,
            },
          ],
          selectedId: id,
        }));
      };

      video.addEventListener("canplay", onReady);
      return;
    }

    // GIF / WEBP / PNG etc.
    const id = `anim-${Date.now()}`;
    const img = new Image();
    img.src = item.url;
    img.crossOrigin = "anonymous";

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
            url: item.url,
            image: img,
            isAnimated: true,
          },
        ],
        selectedId: id,
      }));
    };
  },

  /* ============================================================
      REMOVE OBJECT
  ============================================================ */
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

  /* ============================================================
      BRING TO FRONT
  ============================================================ */
  bringToFront: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;

    set({
      objects: [...get().objects.filter((o) => o.id !== id), obj],
    });
  },

  /* ============================================================
      SEND TO BACK
  ============================================================ */
  sendToBack: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;

    set({
      objects: [obj, ...get().objects.filter((o) => o.id !== id)],
    });
  },

  /* ============================================================
      SET BACKGROUND
============================================================ */
  setBackground: (url) => {
    const { backgroundObjectId } = get();

    if (!url) {
      set((state) => ({
        background: null,
        backgroundObjectId: null,
        objects: state.objects.filter((o) => o.id !== backgroundObjectId),
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
        const cleaned = backgroundObjectId
          ? state.objects.filter((o) => o.id !== backgroundObjectId)
          : state.objects;

        return {
          objects: [
            {
              id,
              type: "image",
              x: 0,
              y: 0,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              url,
              image: img,
              isBackground: true,
            },
            ...cleaned,
          ],
          backgroundObjectId: id,
          background: null,
          selectedId: id,
        };
      });
    };
  },

  setScale: (scale) => set({ scale }),
}));
