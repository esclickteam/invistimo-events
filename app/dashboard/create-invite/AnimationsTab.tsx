"use client";

import Lottie from "lottie-react";
import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface AnimationItem {
  _id: string;
  lottieData: any;
}

export default function AnimationsTab() {
  const { data = [] } = useInvityLibrary("animation");
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

  return (
    <div className="grid grid-cols-3 gap-3 p-3">
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
  );
}
