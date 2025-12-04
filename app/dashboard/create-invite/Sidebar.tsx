"use client";

import { useState } from "react";
import axios from "axios";
import { useEditorStore } from "./editorStore";

interface SidebarProps {
  canvasRef: any;
}

export default function Sidebar({ canvasRef }: SidebarProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const objects = useEditorStore((s) => s.objects);
  const updateObject = useEditorStore((s) => s.updateObject);

  const selectedObject = objects.find((o) => o.id === selectedId);

  const addText = () => canvasRef.current?.addText();
  const addRect = () => canvasRef.current?.addRect();
  const addCircle = () => canvasRef.current?.addCircle();
  const addImage = (url: string) => canvasRef.current?.addImage(url);
  const addLottie = (lottieData: any) => canvasRef.current?.addLottie(lottieData);
  const setBackground = (url: string | null) => canvasRef.current?.setBackground(url);

  const [tab, setTab] = useState<
    "text" | "elements" | "images" | "backgrounds" | "lottie"
  >("text");

  const sampleImages = ["/samples/photo1.jpg", "/samples/photo2.jpg", "/samples/photo3.jpg"];
  const sampleBackgrounds = ["/bg/bg1.jpg", "/bg/bg2.jpg", "/bg/bg3.jpg", "/bg/bg4.jpg"];
  const sampleLotties = ["/lotties/party.json", "/lotties/fireworks.json"];

  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const searchImages = async () => {
    try {
      const unsplashRes = await axios.get(`/api/search-images?query=${query}`);
      const urls = unsplashRes.data.results.map((img: any) => img.urls.small);
      setSearchResults(urls);
    } catch (err) {
      console.error(err);
    }
  };

  /* === רשימת פונטים === */
  const fontOptions = [
    "Assistant",
    "Heebo",
    "Rubik",
    "Arial",
    "David",
    "Noto Sans Hebrew",
  ];

  /* === יישור טקסט typed === */
  const alignments: Array<{ label: string; value: "left" | "center" | "right" }> = [
    { label: "ימין", value: "right" },
    { label: "מרכז", value: "center" },
    { label: "שמאל", value: "left" },
  ];

  return (
    <div className="w-64 bg-white border-r shadow-lg h-screen flex flex-col">

      {/* כותרת */}
      <div className="p-4 font-bold text-lg border-b">כלי עיצוב</div>

      {/* טאבים */}
      <div className="grid grid-cols-3 border-b">
        {["text", "elements", "images", "backgrounds", "lottie"].map((t) => (
          <button
            key={t}
            className={`p-2 ${tab === t ? "bg-gray-100 font-bold" : ""}`}
            onClick={() => setTab(t as any)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* === TAB: TEXT === */}
      {tab === "text" && (
        <div className="p-4 space-y-4 overflow-y-auto">

          {/* ✨ פאנל עריכת טקסט רק אם נבחר טקסט */}
          {selectedObject?.type === "text" && (
            <div className="space-y-4 p-3 border rounded bg-gray-50">

              {/* פונט */}
              <div>
                <label className="text-sm font-bold">פונט</label>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedObject.fontFamily || ""}
                  onChange={(e) =>
                    updateObject(selectedId!, {
                      fontFamily: e.target.value,
                    })
                  }
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              {/* גודל טקסט */}
              <div>
                <label className="text-sm font-bold">גודל טקסט</label>
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

              {/* צבע טקסט */}
              <div>
                <label className="text-sm font-bold">צבע</label>
                <input
                  type="color"
                  value={selectedObject.fill}
                  onChange={(e) =>
                    updateObject(selectedId!, { fill: e.target.value })
                  }
                  className="w-full h-10 cursor-pointer border rounded"
                />
              </div>

              {/* Bold */}
              <button
                className={`w-full py-2 rounded border ${
                  selectedObject.fontWeight === "bold" ? "bg-purple-200" : ""
                }`}
                onClick={() =>
                  updateObject(selectedId!, {
                    fontWeight:
                      selectedObject.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
              >
                <b>Bold</b>
              </button>

              {/* יישור טקסט */}
              <div className="grid grid-cols-3 gap-2">
                {alignments.map((a) => (
                  <button
                    key={a.value}
                    className={`border py-1 rounded ${
                      selectedObject.align === a.value ? "bg-gray-200" : ""
                    }`}
                    onClick={() =>
                      updateObject(selectedId!, { align: a.value })
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* כפתור הוספת טקסט */}
          <button
            className="w-full bg-purple-500 text-white py-2 rounded"
            onClick={addText}
          >
            הוסף טקסט
          </button>
        </div>
      )}

      {/* === TAB: ELEMENTS === */}
      {tab === "elements" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          <button className="w-full border py-2 rounded" onClick={addRect}>
            ריבוע / צורה
          </button>
          <button className="w-full border py-2 rounded" onClick={addCircle}>
            עיגול
          </button>
        </div>
      )}

      {/* === TAB: IMAGES === */}
      {tab === "images" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          <input
            type="text"
            placeholder="חיפוש תמונות"
            className="border p-2 w-full rounded"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchImages()}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {searchResults.length > 0
              ? searchResults.map((src) => (
                  <img
                    key={src}
                    src={src}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => addImage(src)}
                  />
                ))
              : sampleImages.map((src) => (
                  <img
                    key={src}
                    src={src}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => addImage(src)}
                  />
                ))}
          </div>
        </div>
      )}

      {/* === TAB: BACKGROUNDS === */}
      {tab === "backgrounds" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          <button
            className="w-full border py-2 rounded"
            onClick={() => setBackground(null)}
          >
            ללא רקע
          </button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {sampleBackgrounds.map((src) => (
              <img
                key={src}
                src={src}
                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                onClick={() => setBackground(src)}
              />
            ))}
          </div>
        </div>
      )}

      {/* === TAB: LOTTIE === */}
      {tab === "lottie" && (
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {sampleLotties.map((lottie) => (
              <div
                key={lottie}
                className="w-full h-24 border rounded flex items-center justify-center cursor-pointer hover:bg-gray-100"
                onClick={async () => {
                  const res = await fetch(lottie);
                  const json = await res.json();
                  addLottie(json);
                }}
              >
                🎉
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
