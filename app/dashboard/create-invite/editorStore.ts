import { create } from "zustand";

/* ================================
   🎨 Editor Object Type
================================ */
export interface EditorObject {
  id: string;
  type: "text" | "rect" | "circle" | "image" | "lottie";

  // Basic properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;

  // TEXT
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  align?: "left" | "center" | "right";

  // CIRCLE
  radius?: number;

  // IMAGE
  image?: HTMLImageElement | null;

  // LOTTIE
  lottieData?: any;

  // Extension
  [key: string]: any;
}

/* ================================
   🎨 Store State
================================ */
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
  addImage: (url: string) => void;
  addLottie: (data: any) => void;

  removeObject: (id: string) => void;

  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  setBackground: (url: string | null) => void;

  setScale: (scale: number) => void;
}

/* ================================
   🎨 Zustand Store
================================ */
export const useEditorStore = create<EditorState>((set, get) => ({
  objects: [],
  selectedId: null,
  background: null,
  scale: 1,

  /* -------- SELECT -------- */
  setSelected: (id) => set({ selectedId: id }),

  /* -------- UPDATE OBJECT -------- */
  updateObject: (id, data) =>
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? { ...o, ...data } : o
      ),
    })),

  /* -------- ADD TEXT -------- */
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
          align: "center",
          fill: "#000",
        },
      ],
    })),

  /* -------- ADD RECT -------- */
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

  /* -------- ADD CIRCLE -------- */
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

  /* -------- ADD IMAGE -------- */
  addImage: (url: string) => {
    const img = new Image();
    img.src = url;

    img.onload = () => {
      set((state) => ({
        objects: [
          ...state.objects,
          {
            id: `img-${Date.now()}`,
            type: "image",
            x: 100,
            y: 100,
            width: img.width / 3,
            height: img.height / 3,
            image: img,
          },
        ],
      }));
    };
  },

  /* -------- ADD LOTTIE -------- */
  addLottie: (lottieData: any) =>
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

  /* -------- REMOVE -------- */
  removeObject: (id: string) =>
    set((state) => ({
      objects: state.objects.filter((o) => o.id !== id),
      selectedId: null,
    })),

  /* -------- BRING TO FRONT -------- */
  bringToFront: (id: string) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;

    set({
      objects: [...get().objects.filter((o) => o.id !== id), obj],
    });
  },

  /* -------- SEND TO BACK -------- */
  sendToBack: (id: string) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;

    set({
      objects: [obj, ...get().objects.filter((o) => o.id !== id)],
    });
  },

  /* -------- BACKGROUND -------- */
  setBackground: (url: string | null) => set({ background: url }),

  /* -------- SCALE -------- */
  setScale: (scale: number) => set({ scale }),
}));
