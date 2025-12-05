"use client";

import Lottie from "lottie-react";
import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  _id: string;
  lottieData: any;
  thumbnail?: string;
}

export default function AnimationsTab() {
  const { data = [], addToLibrary } = useInvityLibrary("animation"); // כולל addToLibrary
  const addLottie = useEditorStore((s) => s.addLottie);

  const handleAdd = (item: AnimationItem) => {
    addLottie({
      id: `lottie-${Date.now()}`,
      type: "lottie",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      lottieData: item.lottieData,
    });
  };

  const handleAddToLibrary = async () => {
    const newItem: AnimationItem = {
      _id: crypto.randomUUID(),
      lottieData: {}, // אפשר לשים אובייקט לוטי לדיפולטיבי או placeholder
      thumbnail: "/lottie-placeholder.png",
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
        הוסף אנימציה למאגר
      </button>

      <div className="grid grid-cols-3 gap-3">
        {data.map((item: AnimationItem) => (
          <div
            key={item._id}
            className="cursor-pointer"
            onClick={() => handleAdd(item)}
          >
            <Lottie
              animationData={item.lottieData}
              style={{ width: 90, height: 90 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
