"use client";

import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";
import { useEffect, useRef, useState } from "react";

export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData) return null;

  const data =
    typeof canvasData === "string" ? JSON.parse(canvasData) : canvasData;

  if (!data.objects) return null;

  const originalWidth = data.width || 400;
  const originalHeight = data.height || 720;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(null);


  /* ============================================================
     📱 Responsive auto-scale (safe for mobile)
  ============================================================ */
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;

      if (!containerWidth || containerWidth <= 0) return;

      const nextScale = containerWidth / originalWidth;

      // ⛑️ guard — never allow 0 or NaN
      if (nextScale > 0 && Number.isFinite(nextScale)) {
        setScale(nextScale);
      }
    }

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale);
  }, [originalWidth]);

  // ⛔️ אל תצייר Konva עד שיש scale חוקי
  if (!scale) {
    return (
      <div className="w-full flex justify-center">
        <div
          ref={containerRef}
          className="w-full max-w-md h-[300px] bg-white rounded-xl"
        />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-md"
        style={{ position: "relative" }}
      >
        <div
          style={{
            width: originalWidth * scale,
            height: originalHeight * scale,
            margin: "0 auto",
          }}
        >
          <Stage
            width={originalWidth * scale}
            height={originalHeight * scale}
            scaleX={scale}
            scaleY={scale}
          >
            <Layer>
              {data.objects.map((obj) => {
                /* -------------------------------------------------------
                    🔵 RECTANGLE
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
                    🟣 CIRCLE
                ------------------------------------------------------- */
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
                      opacity={obj.opacity ?? 1}
                    />
                  );
                }

                /* -------------------------------------------------------
                    🖼 IMAGE
                ------------------------------------------------------- */
                if (obj.type === "image") {
                  return <PreviewImage key={obj.id} obj={obj} />;
                }

                /* -------------------------------------------------------
                    ✏ TEXT
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

          {/* -------------------------------------------------------
              🟠 LOTTIE — rendered outside Konva
          ------------------------------------------------------- */}
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
    </div>
  );
}

/* ============================================================
   🖼 IMAGE LOADER — loads real image for preview
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
