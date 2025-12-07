"use client";

import { Stage, Layer, Text, Rect } from "react-konva";
import URLImage from "./URLImage";

export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData) return null;

  // 📌 parse JSON if stored as string
  const data =
    typeof canvasData === "string" ? JSON.parse(canvasData) : canvasData;

  if (!data.objects) return null;

  const width = data.width || 900;
  const height = data.height || 1600;

  // 📌 Auto-scale — preview width = 400px
  const scale = 400 / width;

  return (
    <div className="w-full flex justify-center">
      <Stage
        width={width * scale}
        height={height * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {data.objects.map((obj) => {
            /* -------------------------------------------------------
               🔵 מלבן / רקע
            ------------------------------------------------------- */
            if (obj.type === "rect") {
              return (
                <Rect
                  key={obj.id}
                  x={obj.x}
                  y={obj.y}
                  width={obj.width}
                  height={obj.height}
                  fill={obj.fill || "#ffffff"}
                  opacity={obj.opacity ?? 1}
                  cornerRadius={obj.cornerRadius || 0}
                  rotation={obj.rotation || 0}
                />
              );
            }

            /* -------------------------------------------------------
               🖼 תמונה
            ------------------------------------------------------- */
            if (obj.type === "image") {
              return <URLImage key={obj.id} data={obj} />;
            }

            /* -------------------------------------------------------
               ✏ טקסט
            ------------------------------------------------------- */
            if (obj.type === "text") {
              return (
                <Text
                  key={obj.id}
                  x={obj.x}
                  y={obj.y}
                  text={obj.text || ""}
                  fontSize={obj.fontSize || 40}
                  fontFamily={obj.fontFamily || "Arial"}
                  fill={obj.fill || "#000"}
                  width={obj.width}
                  height={obj.height}
                  align={obj.align || "center"}
                  opacity={obj.opacity ?? 1}
                  rotation={obj.rotation || 0}
                />
              );
            }

            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
