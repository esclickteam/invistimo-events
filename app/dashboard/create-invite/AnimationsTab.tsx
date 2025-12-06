"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  name: string;
  url: string;
}

function AnimationsTabComponent() {
  const addObject = useEditorStore((s) => s.addObject);

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
          onClick={() =>
            addObject({
              id: crypto.randomUUID(),
              type: "image",
              url: item.url,
              x: 100,
              y: 100,
              width: 200,
              height: 200,
            })
          }
        >
          <img src={item.url} className="w-full h-full" />
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
