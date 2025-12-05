"use client";

import Image from "next/image";
import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface LottieItem {
  _id: string;
  thumbnail?: string;
  lottieData: any;
  url?: string; // אם רוצים לשמור קישור למאגר
}

export default function LottieTab() {
  const { data = [], addToLibrary } = useInvityLibrary("lottie"); // כולל פונקציה להוספה למאגר
  const addObject = useEditorStore((s) => s.addObject);

  const lottieDataArray = data.length > 0 ? data : []; // אם המאגר ריק

  const handleAddToLibrary = async () => {
    const newItem: LottieItem = {
      _id: crypto.randomUUID(),
      lottieData: {}, // פה אפשר לשים אובייקט לוטי חדש
      thumbnail: "/lottie-placeholder.png",
      url: "/lottie-placeholder.png", // אם רוצים לשמור URL
    };

    addToLibrary && addToLibrary(newItem); // שולח לשרת ומעדכן query cache
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

      {/* רשימת האנימציות מהמאגר */}
      <div className="grid grid-cols-2 gap-3 overflow-y-auto">
        {lottieDataArray.map((item: LottieItem) => (
          <div
            key={item._id}
            className="cursor-pointer p-2 border rounded hover:bg-purple-50"
            onClick={() =>
              addObject({
                id: crypto.randomUUID(),
                type: "lottie",
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                lottieData: item.lottieData,
              })
            }
          >
            <Image
              src={item.thumbnail || "/lottie-placeholder.png"}
              width={100}
              height={100}
              alt="Lottie animation"
              className="rounded mx-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
