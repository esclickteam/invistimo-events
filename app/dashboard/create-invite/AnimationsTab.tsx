"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  name: string;
  url: string;
  format: string;          // gif/webp/mp4/json/...
  resource_type: string;   // video / image
  width?: number;
  height?: number;
}

function AnimationsTab() {
  const addObject = useEditorStore((s) => s.addObject);
  const addAnimatedAsset = useEditorStore((s) => s.addAnimatedAsset);
  const addLottieFromUrl = useEditorStore((s) => s.addLottieFromUrl);

  const { data = [], isLoading } = useQuery<AnimationItem[]>({
    queryKey: ["library", "animations"],
    queryFn: () =>
      fetch("/api/invity/library/animations").then((r) => r.json()),
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

        const handleAdd = () => {
          // 1) Lottie JSON
          if (isLottie) {
            // פונקציה קיימת אצלך ב-store לפי הקוד האחרון ששלחת
            addLottieFromUrl(item.url);
            return;
          }

          // 2) Video (MP4/WEBM)
          if (isVideo) {
            // ה-store שלך כבר מוסיף כ-image עם HTMLVideoElement
            addAnimatedAsset({
              name: item.name,
              url: item.url,
              format,
              width: item.width ?? 250,
              height: item.height ?? 250,
            });
            return;
          }

          // 3) Animated/regular images (GIF/WEBP/PNG...)
          // כאן אנחנו רוצים הסרת רקע אוטומטית (לבן→שקוף)
          addObject({
            id: crypto.randomUUID(),
            type: "image",
            url: item.url,
            x: 100,
            y: 100,
            width: item.width ?? 250,
            height: item.height ?? 250,
            isAnimated: true,
            removeBackground: true,
          });
        };

        return (
          <div
            key={item.name}
            className="cursor-pointer border rounded p-2 bg-white shadow hover:bg-gray-100"
            onClick={handleAdd}
            title={item.name}
          >
            {/* ---- Preview ---- */}
            {isLottie ? (
              <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded">
                <span className="text-xs text-gray-500">Lottie</span>
              </div>
            ) : isVideo ? (
              <video
                src={item.url}
                muted
                autoPlay
                loop
                playsInline
                className="w-full h-32 object-cover rounded"
              />
            ) : (
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-32 object-cover rounded"
              />
            )}
          </div>
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
