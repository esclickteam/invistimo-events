"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  name: string;
  url: string;
  width?: number;
  height?: number;
  format?: string; // gif/webp/mp4/webm/json וכו'
  resource_type?: string; // image / video (מגיע מה-API)
}

function AnimationsTab() {
  // ⭐ חשוב: להשתמש בפונקציה שמטפלת בכל הלוגיקה (וידאו/לוטי/גיפ)
  const addAnimatedAsset = useEditorStore((s) => s.addAnimatedAsset);

  const { data = [], isLoading } = useQuery<AnimationItem[]>({
    queryKey: ["library", "animations"],
    queryFn: () =>
      fetch("/api/invistimo/library/animations").then((r) => r.json()),
  });

  if (isLoading) return <SkeletonGrid />;

  if (!data.length)
    return <p className="text-center text-gray-400">אין אנימציות זמינות.</p>;

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.map((item) => {
        const format = (item.format || "").toLowerCase();
        const isVideo =
          item.resource_type === "video" || format === "mp4" || format === "webm";
        const isLottie = format === "json";

        // ✅ שולחים רק שדות שהטיפוס של addAnimatedAsset מכיר
        const payload = {
          name: item.name,
          url: item.url,
          format: item.format,
          width: item.width,
          height: item.height,
        };

        return (
          <button
            key={item.name}
            type="button"
            className="cursor-pointer border rounded p-2 bg-white shadow hover:bg-gray-50 text-left"
            onClick={() => addAnimatedAsset(payload)}
            title={item.name}
          >
            {/* ---- Preview ---- */}
            <div className="w-full h-32 rounded overflow-hidden bg-gray-50 flex items-center justify-center">
              {isVideo ? (
                <video
                  src={item.url}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : isLottie ? (
                <div className="text-xs text-gray-500 font-medium">
                  Lottie JSON
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="mt-2 text-xs text-gray-600 truncate">
              {item.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default memo(AnimationsTab);

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="w-full h-32 bg-gray-200 animate-pulse rounded"
        />
      ))}
    </div>
  );
}
