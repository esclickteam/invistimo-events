"use client";

import { useState } from "react";
import axios from "axios";
import { useEditorStore } from "./editorStore";

/* -----------------------------------------
   ICONIFY – מאגר אייקונים עצום כמו קאנבה
------------------------------------------ */
import { Icon } from "@iconify/react";

/* -----------------------------------------
   LOTTIE – אנימציות כמו בקאנבה
------------------------------------------ */
import Lottie from "lottie-react";

/* -----------------------------------------
   PATTERNS – פטרנים יפים לרקעים
------------------------------------------ */
const patterns = [
  { name: "Dots", css: "radial-gradient(#ccc 1px, transparent 1px)" },
  { name: "Stripes", css: "repeating-linear-gradient(45deg,#ccc,#ccc 10px,transparent 10px,transparent 20px)" },
  { name: "Grid", css: "linear-gradient(#ccc 1px, transparent 1px),linear-gradient(90deg,#ccc 1px, transparent 1px)" },
];

/* -----------------------------------------
   GRADIENTS – גרדיאנטים יפים
------------------------------------------ */
const gradients = [
  ["#ff9a9e", "#fad0c4"],
  ["#a18cd1", "#fbc2eb"],
  ["#f6d365", "#fda085"],
  ["#96e6a1", "#d4fc79"],
  ["#84fab0", "#8fd3f4"],
];

/* -----------------------------------------
   דוגמאות לוטי
------------------------------------------ */
const sampleLotties = [
  "/lotties/party.json",
  "/lotties/fireworks.json",
];

interface SidebarProps {
  canvasRef: any;
}

export default function Sidebar({ canvasRef }: SidebarProps) {
  // Zustand
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const selectedObject = objects.find((o) => o.id === selectedId);

  // Canvas methods
  const addText = () => canvasRef.current?.addText();
  const addRect = () => canvasRef.current?.addRect();
  const addCircle = () => canvasRef.current?.addCircle();
  const addImage = (url: string) => canvasRef.current?.addImage(url);
  const addLottie = (data: any) => canvasRef.current?.addLottie(data);
  const setBackground = (bg: string) => canvasRef.current?.setBackground(bg);

  // Tabs
  const [tab, setTab] = useState<
    "text" | "elements" | "icons" | "images" | "backgrounds" | "lottie"
  >("text");

  // Image search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const searchImages = async () => {
    try {
      const res = await axios.get(`/api/search-images?query=${query}`);
      const urls = res.data.results.map((x: any) => x.urls.small);
      setSearchResults(urls);
    } catch (err) {
      console.error(err);
    }
  };

  // Text settings
  const fontOptions = ["Assistant", "Heebo", "Rubik", "David"];
  const alignments = [
    { label: "ימין", value: "right" },
    { label: "מרכז", value: "center" },
    { label: "שמאל", value: "left" },
  ];

  return (
    <aside className="w-72 bg-white border-r shadow-lg h-screen flex flex-col">

      {/* HEADER */}
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* TABS */}
      <div className="w-full flex border-b text-sm font-medium">
        {[
          ["text", "טקסט"],
          ["elements", "צורות"],
          ["icons", "אייקונים"],
          ["images", "תמונות"],
          ["backgrounds", "רקעים"],
          ["lottie", "אנימציות"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`flex-1 p-2 text-center border-l first:border-l-0 ${
              tab === key ? "bg-purple-100 text-purple-700 font-bold" : "hover:bg-gray-50"
            }`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* -----------------------------------------
         TEXT TAB
      ------------------------------------------ */}
      {tab === "text" && (
        <div className="p-4 space-y-4 overflow-y-auto">

          {selectedObject?.type === "text" && (
            <div className="p-3 border bg-gray-50 rounded space-y-4">

              {/* FONT */}
              <div>
                <label>פונט</label>
                <select
                  value={selectedObject.fontFamily}
                  onChange={(e) =>
                    updateObject(selectedId!, { fontFamily: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                >
                  {fontOptions.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* SIZE */}
              <div>
                <label>גודל</label>
                <input
                  type="number"
                  value={selectedObject.fontSize}
                  onChange={(e) =>
                    updateObject(selectedId!, { fontSize: Number(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* COLOR */}
              <div>
                <label>צבע</label>
                <input
                  type="color"
                  value={selectedObject.fill}
                  onChange={(e) =>
                    updateObject(selectedId!, { fill: e.target.value })
                  }
                  className="w-full h-10 border rounded"
                />
              </div>

              {/* ALIGN */}
              <div className="grid grid-cols-3 gap-2">
                {alignments.map((a) => (
                  <button
                    key={a.value}
                    className={`border rounded py-1 ${
                      selectedObject.align === a.value ? "bg-purple-200" : ""
                    }`}
                    onClick={() =>
                      updateObject(selectedId!, {
                        align: a.value as "left" | "center" | "right",
                      })
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={addText}
            className="w-full bg-purple-600 text-white py-2 rounded"
          >
            הוסף טקסט
          </button>
        </div>
      )}

      {/* -----------------------------------------
         ELEMENTS TAB – צורות וקטנות כמו בקאנבה
      ------------------------------------------ */}
      {tab === "elements" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          <button onClick={addRect} className="w-full border rounded py-2">
            ריבוע
          </button>
          <button onClick={addCircle} className="w-full border rounded py-2">
            עיגול
          </button>
        </div>
      )}

      {/* -----------------------------------------
         ICONS – כאן השינוי הגדול!!
         אלפי אייקונים יפים מ־Iconify, כמו בקאנבה
      ------------------------------------------ */}
      {tab === "icons" && (
        <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto">

          {[
            "mdi:heart",
            "mdi:party-popper",
            "mdi:diamond",
            "mdi:butterfly",
            "mdi:flower",
            "mdi:star",
            "mdi:gift",
            "mdi:balloon",
            "mdi:lightning-bolt",
            "mdi:camera",
            "mdi:crown",
            "mdi:leaf",
          ].map((icon) => (
            <div
              key={icon}
              onClick={() => addImage(`https://api.iconify.design/${icon}.svg`)}
              className="p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-center"
            >
              <Icon icon={icon} width={32} height={32} />
            </div>
          ))}
        </div>
      )}

      {/* -----------------------------------------
         IMAGES (Unsplash/Pexels)
      ------------------------------------------ */}
      {tab === "images" && (
        <div className="p-4 space-y-4 overflow-y-auto">

          <input
            type="text"
            placeholder="חיפוש תמונות…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchImages()}
            className="border p-2 w-full rounded"
          />

          <div className="grid grid-cols-2 gap-2 mt-2">
            {searchResults.map((src) => (
              <img
                key={src}
                src={src}
                className="h-24 w-full object-cover rounded cursor-pointer"
                onClick={() => addImage(src)}
              />
            ))}
          </div>
        </div>
      )}

      {/* -----------------------------------------
         BACKGROUNDS – צבעים, פטרנים, גרדיאנטים
      ------------------------------------------ */}
      {tab === "backgrounds" && (
        <div className="p-4 space-y-6 overflow-y-auto">

          {/* COLORS */}
          <div className="grid grid-cols-5 gap-2">
            {["#fff", "#000", "#f3e5f5", "#e3f2fd", "#ffe0b2"].map((c) => (
              <div
                key={c}
                className="h-10 rounded cursor-pointer"
                style={{ backgroundColor: c }}
                onClick={() => setBackground(c)}
              ></div>
            ))}
          </div>

          {/* GRADIENTS */}
          <div className="grid grid-cols-2 gap-2">
            {gradients.map((g, i) => (
              <div
                key={i}
                className="h-20 rounded cursor-pointer"
                style={{
                  backgroundImage: `linear-gradient(45deg, ${g[0]}, ${g[1]})`,
                }}
                onClick={() =>
                  setBackground(`linear-gradient(45deg, ${g[0]}, ${g[1]})`)
                }
              />
            ))}
          </div>

          {/* PATTERNS */}
          <div className="grid grid-cols-2 gap-2">
            {patterns.map((p) => (
              <div
                key={p.name}
                className="h-20 rounded cursor-pointer bg-white"
                style={{
                  backgroundImage: p.css,
                  backgroundSize: "20px 20px",
                }}
                onClick={() => setBackground(p.css)}
              />
            ))}
          </div>
        </div>
      )}

      {/* -----------------------------------------
         LOTTIE
      ------------------------------------------ */}
      {tab === "lottie" && (
        <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
          {sampleLotties.map((path) => (
            <div
              key={path}
              className="h-24 border rounded flex items-center justify-center cursor-pointer hover:bg-gray-100"
              onClick={async () => {
                const res = await fetch(path);
                const json = await res.json();
                addLottie(json);
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

    </aside>
  );
}
