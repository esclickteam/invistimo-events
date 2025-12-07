"use client";

import { Stage, Layer, Text } from "react-konva";
import URLImage from "./URLImage";

export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData || !canvasData.objects) return null;

  const width = canvasData.width || 900;
  const height = canvasData.height || 1600;

  // נקטין כדי להתאים למסך
  const scale = 400 / width;

  return (
    <div className="w-full flex justify-center">
      <Stage width={width * scale} height={height * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          {canvasData.objects.map(obj => {
            if (obj.type === "image") {
              return <URLImage key={obj.id} data={obj} />;
            }

            if (obj.type === "text") {
              return (
                <Text
                  key={obj.id}
                  x={obj.x}
                  y={obj.y}
                  text={obj.text}
                  fontSize={obj.fontSize}
                  fontFamily={obj.fontFamily}
                  fill={obj.fill || "#000"}
                  width={obj.width}
                  height={obj.height}
                  align={obj.align || "center"}
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
