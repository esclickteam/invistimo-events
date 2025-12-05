"use client";

import Image from "next/image";
import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface BackgroundItem {
  _id: string;
  url: string;
  thumbnail?: string;
}

export default function BackgroundsTab() {
  const { data = [] } = useInvityLibrary("background");
  const setBackground = useEditorStore((s) => s.setBackground);

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {data.map((item: BackgroundItem) => (
        <div
          key={item._id}
          className="cursor-pointer"
          onClick={() => setBackground(item.url)}
        >
          <Image
            src={item.thumbnail || item.url}
            width={150}
            height={220}
            alt=""
            className="rounded shadow"
          />
        </div>
      ))}
    </div>
  );
}
