"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  name: string;
  url: string;
  format?: string; // ⭐ חשוב לקבל מ-API את פורמט הקובץ
  width?: number;
  height?: number;
}

function AnimationsTabComponent() {
  const addAnimatedAsset = useEditorStore((s) => s.addAnimatedAsset);

  const { data = [], isLoading } = useQuery<AnimationItem[]>({
    queryKey: ["library", "animations"],
    queryFn: () =>
      fetch("/api/invity/library/animations").then((r) => r.json()),
  });

  if (isLoading) return <SkeletonGrid />;

  if (!data.length)
    return <p className="text-center text-gray-400">אין אנימציות זמינות.</p>;

  return (
    <div className="grid grid-cols-3 gap-3">
      {data.map((item) => (
        <div
          key={item.name}
          className="cursor-pointer border rounded hover:bg-gray-100 p-2"
          onClick={() => addAnimatedAsset(item)} // ⭐ שימוש בפונקציה החדשה
        >
          {/* תצוגה מקדימה */}
          <img src={item.url} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export default memo(AnimationsTabComponent);

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-full h-24 bg-gray-200 animate-pulse rounded" />
      ))}
    </div>
  );
}
