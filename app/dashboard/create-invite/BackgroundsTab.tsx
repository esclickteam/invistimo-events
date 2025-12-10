"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface BgItem {
  name: string;
  url: string;
}

function BackgroundsTabComponent() {
  // ⭐ במקום addBackground → הפונקציה הנכונה היא setBackground
  const setBackground = useEditorStore((s) => s.setBackground);

  const { data = [], isLoading } = useQuery<BgItem[]>({
    queryKey: ["library", "backgrounds"],
    queryFn: () =>
      fetch("/api/invistimo/library/backgrounds").then((r) => r.json()),
  });

  if (isLoading) return <SkeletonGrid />;

  if (!data.length)
    return <p className="text-center text-gray-400">אין רקעים זמינים.</p>;

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map((item) => (
        <div
          key={item.name}
          className="cursor-pointer border rounded overflow-hidden hover:ring-2 hover:ring-purple-400"
          onClick={() => setBackground(item.url)} // ⭐ פה התיקון
        >
          <img src={item.url} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export default memo(BackgroundsTabComponent);

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
