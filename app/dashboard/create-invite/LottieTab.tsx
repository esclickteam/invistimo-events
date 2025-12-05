"use client";

import Image from "next/image";
import { useInvityLibrary } from "@/app/hooks/useInvityLibrary";
import { useEditorStore } from "./editorStore";

interface LottieItem {
  _id: string;
  thumbnail?: string;
  lottieData: any;
}

export default function LottieTab() {
  const { data = [] } = useInvityLibrary("lottie");
  const addObject = useEditorStore((s) => s.addObject);

  return (
    <div className="grid grid-cols-2 gap-3 p-3 overflow-y-auto">
      {data.map((item: LottieItem) => {
        const lottieData = item.lottieData;

        return (
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
                lottieData,
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
        );
      })}
    </div>
  );
}
