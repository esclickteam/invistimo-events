"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface ElementItem {
  name: string;
  url: string;
}

function ElementsTabComponent() {
  const addObject = useEditorStore((s) => s.addObject);

  const { data = [], isLoading } = useQuery<ElementItem[]>({
    queryKey: ["library", "elements"],
    queryFn: () =>
      fetch("/api/invistimo/library/elements").then((r) => r.json()),
  });

  if (isLoading) return <SkeletonGrid />;

  if (!data.length)
    return (
      <p className="text-center text-gray-400">אין אלמנטים זמינים כרגע.</p>
    );

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
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

export default memo(ElementsTabComponent);

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
