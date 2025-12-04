"use client";

import { useState } from "react";
import axios from "axios";
import { useEditorStore } from "./editorStore";

/* === ICON LIBRARIES === */
import { Icon } from "@iconify/react";
import * as Unicons from "@iconscout/react-unicons";
import { Heart, Star, Camera } from "lucide-react";
import * as Feather from "react-feather";
import * as MuiIcons from "@mui/icons-material";

/* === LOTTIE === */
import lottieLight from "lottie-web/build/player/lottie_light";

/* -------------------------------------------
   PATTERNS — ללא hero-patterns, ללא שגיאות
-------------------------------------------- */
const patterns: Record<
  "dots" | "stripes" | "grid",
  (color?: string) => string
> = {
  dots: (color = "#ccc") =>
    `radial-gradient(${color} 1px, transparent 1px)`,

  stripes: (color = "#ccc") =>
    `repeating-linear-gradient(45deg, ${color}, ${color} 10px, transparent 10px, transparent 20px)`,

  grid: (color = "#ccc") =>
    `linear-gradient(${color} 1px, transparent 1px),
     linear-gradient(90deg, ${color} 1px, transparent 1px)`,
};

/* ------------------------------------------- */

interface SidebarProps {
  canvasRef: any;
}

export default function Sidebar({ canvasRef }: SidebarProps) {
  /* === Zustand store === */
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const selectedObject = objects.find((o) => o.id === selectedId);

  /* === Canvas Actions === */
  const addText = () => canvasRef.current?.addText();
  const addRect = () => canvasRef.current?.addRect();
  const addCircle = () => canvasRef.current?.addCircle();
  const addImage = (url: string) => canvasRef.current?.addImage(url);
  const addLottie = (data: any) => canvasRef.current?.addLottie(data);
  const setBackground = (bg: any) => canvasRef.current?.setBackground(bg);

  /* === Tabs === */
  const [tab, setTab] = useState<
    "text" | "elements" | "icons" | "backgrounds" | "lottie"
  >("text");

  /* === Image Search === */
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const searchImages = async () => {
    try {
      const res = await axios.get(`/api/search-images?query=${query}`);
      const urls = res.data.results.map((img: any) => img.urls.small);
      setSearchResults(urls);
    } catch (e) {
      console.error(e);
    }
  };

  /* === Text Tools === */
  const fontOptions = ["Assistant", "Heebo", "Rubik", "David"];

  const alignments: { label: string; value: "left" | "center" | "right" }[] = [
    { label: "ימין", value: "right" },
    { label: "מרכז", value: "center" },
    { label: "שמאל", value: "left" },
  ];

  /* === Icons === */
  const iconifyIcons = ["mdi:flower", "mdi:gift", "mdi:party-popper"];
  const lucideIcons = [Heart, Star, Camera];
  const featherIcons = [Feather.Star, Feather.Heart, Feather.Smile];
  const muiIcons = ["Favorite", "Star", "Cake", "Celebration"];

  /* ============================================
     UI START
  ============================================ */

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
          ["backgrounds", "רקעים"],
          ["lottie", "אנימציות"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`flex-1 p-2 text-center border-l first:border-l-0 ${
              tab === key
                ? "bg-purple-100 text-purple-700 font-bold"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------
          TEXT TAB
      ---------------------------------------- */}
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
                  {fontOptions.map((font) => (
                    <option key={font}>{font}</option>
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
                    updateObject(selectedId!, {
                      fontSize: Number(e.target.value),
                    })
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

      {/* ---------------------------------------
          ELEMENTS TAB
      ---------------------------------------- */}
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

      {/* ---------------------------------------
          ICONS TAB
      ---------------------------------------- */}
      {tab === "icons" && (
        <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto">

          {/* ICONIFY */}
          {iconifyIcons.map((icon) => (
            <div
              key={icon}
              onClick={() => addImage(icon)}
              className="p-2 rounded bg-gray-50 cursor-pointer"
            >
              <Icon icon={icon} width={34} height={34} />
            </div>
          ))}

          {/* UNICONS */}
          {Object.values(Unicons)
            .slice(0, 12)
            .map((U: any, i) => (
              <div key={i} className="p-2 rounded bg-gray-50 cursor-pointer">
                <U size={34} />
              </div>
            ))}

          {/* LUCIDE */}
          {lucideIcons.map((L, i) => (
            <div key={i} className="p-2 rounded bg-gray-50 cursor-pointer">
              <L size={34} />
            </div>
          ))}

          {/* FEATHER */}
          {featherIcons.map((F, i) => (
            <div key={i} className="p-2 rounded bg-gray-50 cursor-pointer">
              <F size={34} />
            </div>
          ))}

          {/* MATERIAL ICONS */}
          {muiIcons.map((name) => {
            const Comp = (MuiIcons as any)[name];
            return (
              <div key={name} className="p-2 rounded bg-gray-50 cursor-pointer">
                <Comp fontSize="large" />
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------
          BACKGROUNDS TAB
      ---------------------------------------- */}
      {tab === "backgrounds" && (
        <div className="p-4 space-y-6 overflow-y-auto">

          {/* COLORS */}
          <div className="grid grid-cols-5 gap-2">
            {["#fff", "#000", "#e3f2fd", "#fce4ec", "#f3e5f5"].map((c) => (
              <div
                key={c}
                className="h-10 rounded cursor-pointer"
                style={{ backgroundColor: c }}
                onClick={() => setBackground(c)}
              />
            ))}
          </div>

          {/* GRADIENTS */}
          <div className="grid grid-cols-2 gap-2">
            {[["#ff9a9e", "#fad0c4"], ["#a18cd1", "#fbc2eb"], ["#f6d365", "#fda085"], ["#96e6a1", "#d4fc79"], ["#84fab0", "#8fd3f4"]].map(
              (g, i) => (
                <div
                  key={i}
                  className="h-20 rounded cursor-pointer"
                  style={{
                    backgroundImage: `linear-gradient(45deg, ${g.join(",")})`,
                  }}
                  onClick={() =>
                    setBackground(`linear-gradient(45deg, ${g.join(",")})`)
                  }
                />
              )
            )}
          </div>

          {/* PATTERNS */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(patterns) as Array<keyof typeof patterns>).map(
              (p) => (
                <div
                  key={p}
                  className="h-20 rounded cursor-pointer bg-white"
                  style={{
                    backgroundImage: patterns[p]("#aaa"),
                    backgroundSize: p === "grid" ? "20px 20px" : "auto",
                  }}
                  onClick={() => setBackground(patterns[p]("#aaa"))}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------
          LOTTIE TAB
      ---------------------------------------- */}
      {tab === "lottie" && (
        <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
          {["/lotties/party.json", "/lotties/fireworks.json"].map((path) => (
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
