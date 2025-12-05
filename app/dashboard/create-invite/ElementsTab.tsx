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
  const { data = [], addToLibrary } = useInvityLibrary("element"); // הוספנו addToLibrary
  const addImage = useEditorStore((s) => s.addImage);

  const handleAdd = (item: LibraryItem) => {
    addImage({
      url: item.url,
      width: 250,
      height: 250,
      removeBackground: true,
    });
  };

  const handleAddToLibrary = async () => {
    const newItem: LibraryItem = {
      _id: crypto.randomUUID(),
      url: "/placeholder.png", // ניתן להחליף ל-URL של התמונה החדשה
      thumbnail: "/placeholder.png",
    };

    addToLibrary && addToLibrary(newItem); // מוסיף למאגר
  };

  return (
    <div className="p-3">
      {/* כפתור להוספה למאגר */}
      <button
        onClick={handleAddToLibrary}
        className="mb-3 w-full bg-purple-600 text-white py-2 rounded"
      >
        הוסף תמונה למאגר
      </button>

      {/* רשימת אלמנטים */}
      <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
}
