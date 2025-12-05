"use client";

import Image from "next/image";
import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface LibraryItem {
  _id: string;
  url: string;
  thumbnail?: string;
}

export default function ElementsTab() {
  const { data = [] } = useInvityLibrary("element");

  const addImage = useEditorStore((s) => s.addImage);

  const handleAdd = (item: LibraryItem) => {
    addImage({
      url: item.url,
      width: 250,
      height: 250,
      removeBackground: true,
    });
  };

  return (
    <div className="grid grid-cols-3 gap-3 p-3">
      {data.map((item: LibraryItem) => (
        <div
          key={item._id}
          className="cursor-pointer"
          onClick={() => handleAdd(item)}
        >
          <Image
            src={item.thumbnail || item.url}
            width={90}
            height={90}
            alt=""
            className="rounded shadow"
          />
        </div>
      ))}
    </div>
  );
}
