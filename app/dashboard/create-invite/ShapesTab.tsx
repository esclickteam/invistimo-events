"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface ShapeItem {
  name: string;
  url: string;
}

function ShapesTabComponent() {
  const addObject = useEditorStore((s) => s.addObject);

  const { data = [], isLoading } = useQuery<ShapeItem[]>({
    queryKey: ["library", "shapes"],
    queryFn: () => fetch("/api/invity/library/shapes").then((r) => r.json()),
  });

  if (isLoading) return <SkeletonGrid />;

  if (!data.length)
    return <p className="text-center text-gray-400">אין צורות זמינות כרגע.</p>;

  return (
    <div className="grid grid-cols-3 gap-3">
      {data.map((item) => (
        <div
          key={item.name}
          className="cursor-pointer p-2 border rounded hover:bg-gray-100"
          onClick={() =>
            addObject({
              id: crypto.randomUUID(),
              type: "image",
              url: item.url,
              x: 150,
              y: 150,
              width: 200,
              height: 200,
            })
          }
        >
          <img src={item.url} className="w-full h-full object-contain" />
        </div>
      ))}
    </div>
  );
}

export default memo(ShapesTabComponent);

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-full h-24 bg-gray-200 animate-pulse rounded"
        />
      ))}
    </div>
  );
}
