"use client";

import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";
import { useEffect, useRef, useState } from "react";

export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData) return null;

  let data;

  try {
    data =
      typeof canvasData === "string"
        ? JSON.parse(canvasData)
        : canvasData;
  } catch {
    return null;
  }

  if (!data || !Array.isArray(data.objects)) return null;

  const sourceWidth = data.width || 400;
  const sourceHeight = data.height || 720;

  const containerRef = useRef(null);
  const [layout, setLayout] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    canvasHeight: 0,
  });

  useEffect(() => {
    function updateLayout() {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;

      // 🎯 קנבס קבוע כמו פוסט אינסטגרם
      const targetHeight = containerWidth * 1.25;

      // חישוב scale כך שהתמונה תיכנס כולה
      const scaleX = containerWidth / sourceWidth;
      const scaleY = targetHeight / sourceHeight;
      const scale = Math.min(scaleX, scaleY);

      const renderedWidth = sourceWidth * scale;
      const renderedHeight = sourceHeight * scale;

      setLayout({
        scale,
        offsetX: (containerWidth - renderedWidth) / 2,
        offsetY: (targetHeight - renderedHeight) / 2,
        canvasHeight: targetHeight,
      });
    }

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [sourceWidth, sourceHeight]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-md relative bg-white"
        style={{
          height: layout.canvasHeight,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: layout.offsetY,
            left: layout.offsetX,
          }}
        >
          <Stage
            width={sourceWidth}
            height={sourceHeight}
            scaleX={layout.scale}
            scaleY={layout.scale}
            listening={false}
          >
            <Layer>
              {data.objects.map((obj) => {
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

                if (obj.type === "circle") {
                  return (
                    <Rect
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      width={obj.radius * 2}
                      height={obj.radius * 2}
                      cornerRadius={obj.radius}
                      fill={obj.fill}
                    />
                  );
                }

                if (obj.type === "image") {
                  return <PreviewImage key={obj.id} obj={obj} />;
                }

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

        {data.objects
          .filter((o) => o.type === "lottie")
          .map((obj) => (
            <div
              key={obj.id}
              style={{
                position: "absolute",
                top: layout.offsetY + obj.y * layout.scale,
                left: layout.offsetX + obj.x * layout.scale,
                width: obj.width * layout.scale,
                height: obj.height * layout.scale,
                pointerEvents: "none",
              }}
            >
              <Lottie animationData={obj.lottieData} />
            </div>
          ))}
      </div>
    </div>
  );
}

function PreviewImage({ obj }) {
  const [image] = useImage(obj.url, "anonymous");
  if (!image) return null;

  return (
    <KonvaImage
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      image={image}
      opacity={obj.opacity ?? 1}
      rotation={obj.rotation || 0}
    />
  );
}