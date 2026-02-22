"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";

export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData) return null;

  let data;

  try {
    data =
      typeof canvasData === "string"
        ? JSON.parse(canvasData)
        : canvasData;
  } catch (err) {
    console.error("❌ Invalid canvasData:", canvasData);
    return null;
  }

  if (!data || !Array.isArray(data.objects)) {
    console.warn("⚠️ canvasData has no objects:", data);
    return null;
  }

  /* ============================================================
     🧠 לוקחים את הגודל המקורי שנשמר
  ============================================================ */

  const sourceWidth = Number(data.width) || 400;
  const sourceHeight = Number(data.height) || 720;

  /* ============================================================
     📱 התאמה חכמה לרוחב מסך
  ============================================================ */

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;

      // מתאים תמיד לרוחב המסך
      setScale(containerWidth / sourceWidth);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [sourceWidth]);

  /* ============================================================
     🎨 RENDER
  ============================================================ */

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-3xl relative"
      >
        <Stage
          width={sourceWidth}
          height={sourceHeight}
          scaleX={scale}
          scaleY={scale}
          listening={false}
          style={{
            display: "block",
          }}
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
                const r = obj.radius || 0;
                return (
                  <Rect
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={r * 2}
                    height={r * 2}
                    cornerRadius={r}
                    fill={obj.fill}
                    opacity={obj.opacity ?? 1}
                    rotation={obj.rotation || 0}
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
                    lineHeight={obj.lineHeight ?? 1.2}
                    fontStyle={[
                      obj.fontWeight === "bold" ? "bold" : null,
                      obj.italic ? "italic" : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    textDecoration={obj.underline ? "underline" : undefined}
                  />
                );
              }

              return null;
            })}
          </Layer>
        </Stage>

        {/* ================= LOTTIE ================= */}
        {data.objects
          .filter((o) => o.type === "lottie")
          .map((obj) => (
            <div
              key={obj.id}
              style={{
                position: "absolute",
                top: obj.y * scale,
                left: obj.x * scale,
                width: obj.width * scale,
                height: obj.height * scale,
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

/* ============================================================
   🖼 IMAGE LOADER
============================================================ */

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