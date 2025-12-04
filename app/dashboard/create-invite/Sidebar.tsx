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

/* === BACKGROUND LIBRARIES === */
import * as patterns from "hero-patterns";
import gradients from "ui-gradients";

/* === LOTTIE === */
import lottieLight from "lottie-web/build/player/lottie_light";

interface SidebarProps {
  canvasRef: any;
}

export default function Sidebar({ canvasRef }: SidebarProps) {
  /* === ZUSTAND STORE === */
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);
  const selectedObject = objects.find((o) => o.id === selectedId);

  /* === CANVAS FUNCTIONS === */
  const addText = () => canvasRef.current?.addText();
  const addRect = () => canvasRef.current?.addRect();
  const addCircle = () => canvasRef.current?.addCircle();
  const addImage = (url: string) => canvasRef.current?.addImage(url);
  const addLottie = (data: any) => canvasRef.current?.addLottie(data);
  const setBackground = (bg: any) => canvasRef.current?.setBackground(bg);

  /* === TABS === */
  const [tab, setTab] = useState<
    "text" | "elements" | "icons" | "backgrounds" | "lottie"
  >("text");

  /* === SAMPLE ASSETS === */
  const sampleImages = ["/samples/photo1.jpg", "/samples/photo2.jpg"];
  const sampleLotties = ["/lotties/party.json", "/lotties/fireworks.json"];

  /* === IMAGE SEARCH === */
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

  /* === FONTS === */
  const fontOptions = ["Assistant", "Heebo", "Rubik", "David"];
  const alignments = [
    { label: "ימין", value: "right" as const },
    { label: "מרכז", value: "center" as const },
    { label: "שמאל", value: "left" as const },
  ];

  /* === ICON PACKS === */
  const iconifyIcons = ["mdi:flower", "mdi:gift", "mdi:party-popper"];
  const lucideIcons = [Heart, Star, Camera];
  const featherIcons = [Feather.Star, Feather.Heart, Feather.Smile];
  const muiIcons = ["Favorite", "Star", "Cake", "Celebration"];

  return (
    <div className="w-72 bg-white border-r shadow-lg h-screen flex flex-col">

      {/* HEADER */}
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* TABS */}
      <div className="w-full flex border-b text-sm font-medium bg-gray-50">
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
                ? "bg-purple-200 text-purple-900 font-bold"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---------------- TEXT TAB ---------------- */}
      {tab === "text" && (
        <div className="p-4 space-y-4 overflow-y-auto">

          {selectedObject?.type === "text" && (
            <div className="space-y-4 p-3 border bg-gray-50 rounded">

              {/* FONT */}
              <div>
                <label className="text-sm font-bold">פונט</label>
                <select
                  value={selectedObject.fontFamily}
                  className="w-full border p-2 rounded"
                  onChange={(e) =>
                    updateObject(selectedId!, { fontFamily: e.target.value })
                  }
                >
                  {fontOptions.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
              </div>

              {/* SIZE */}
              <div>
                <label className="text-sm font-bold">גודל</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={selectedObject.fontSize}
                  onChange={(e) =>
                    updateObject(selectedId!, {
                      fontSize: Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* COLOR */}
              <div>
                <label className="text-sm font-bold">צבע</label>
                <input
                  type="color"
                  value={selectedObject.fill}
                  className="w-full h-10 border rounded"
                  onChange={(e) =>
                    updateObject(selectedId!, { fill: e.target.value })
                  }
                />
              </div>

              {/* ALIGN */}
              <div className="grid grid-cols-3 gap-2">
                {alignments.map((a) => (
                  <button
                    key={a.value}
                    className={`border py-1 rounded ${
                      selectedObject.align === a.value ? "bg-purple-300" : ""
                    }`}
                    onClick={() => updateObject(selectedId!, { align: a.value })}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className="w-full bg-purple-600 text-white py-2 rounded"
            onClick={addText}
          >
            הוסף טקסט
          </button>
        </div>
      )}

      {/* ---------------- ELEMENTS TAB ---------------- */}
      {tab === "elements" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          <button className="w-full border p-2 rounded" onClick={addRect}>
            ריבוע
          </button>
          <button className="w-full border p-2 rounded" onClick={addCircle}>
            עיגול
          </button>
        </div>
      )}

      {/* ---------------- ICONS TAB ---------------- */}
      {tab === "icons" && (
        <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto">

          {/* ICONIFY */}
          {iconifyIcons.map((icon) => (
            <div
              key={icon}
              className="p-2 bg-gray-50 rounded cursor-pointer"
              onClick={() => addImage(icon)}
            >
              <Icon icon={icon} width={34} height={34} />
            </div>
          ))}

          {/* UNICONS */}
          {Object.values(Unicons)
            .slice(0, 12)
            .map((U: any, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded cursor-pointer">
                <U size={34} />
              </div>
            ))}

          {/* LUCIDE */}
          {lucideIcons.map((L, i) => (
            <div key={i} className="p-2 bg-gray-50 rounded cursor-pointer">
              <L size={34} />
            </div>
          ))}

          {/* FEATHER */}
          {featherIcons.map((F, i) => (
            <div key={i} className="p-2 bg-gray-50 rounded cursor-pointer">
              <F size={34} />
            </div>
          ))}

          {/* MATERIAL ICONS — FIXED TS ERROR */}
          {muiIcons.map((name) => {
            const Comp = (MuiIcons as any)[name];
            return (
              <div key={name} className="p-2 bg-gray-50 rounded cursor-pointer">
                <Comp fontSize="large" />
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- BACKGROUNDS TAB ---------------- */}
      {tab === "backgrounds" && (
        <div className="p-4 space-y-6 overflow-y-auto">

          {/* SOLID COLORS */}
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
          <div className="grid grid-cols-2 gap-3">
            {gradients.slice(0, 20).map((g: any) => (
              <div
                key={g.name}
                className="h-20 rounded cursor-pointer"
                style={{
                  backgroundImage: `linear-gradient(45deg, ${g.colors.join(",")})`,
                }}
                onClick={() =>
                  setBackground(`linear-gradient(45deg, ${g.colors.join(",")})`)
                }
              />
            ))}
          </div>

          {/* PATTERNS */}
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(patterns)
              .slice(0, 20)
              .map((p) => (
                <div
                  key={p}
                  className="h-20 rounded cursor-pointer bg-white"
                  style={{
                    backgroundImage: patterns[p]("#000000", 0.25),
                  }}
                  onClick={() => setBackground(patterns[p]("#000000", 0.25))}
                />
              ))}
          </div>
        </div>
      )}

      {/* ---------------- LOTTIE TAB ---------------- */}
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
    </div>
  );
}
