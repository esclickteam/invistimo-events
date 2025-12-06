"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  name: string;
  url: string;
  format: string;
  resource_type: string;
}

function AnimationsTab() {
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
    <div className="grid grid-cols-2 gap-4">
      {data.map((item) => (
        <div
          key={item.name}
          className="cursor-pointer border rounded p-2 bg-white shadow hover:bg-gray-100"
          onClick={() => addAnimatedAsset(item)}
        >
          {item.resource_type === "video" ? (
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
      ))}
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
