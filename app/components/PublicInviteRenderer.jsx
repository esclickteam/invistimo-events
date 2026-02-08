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
  } catch (err) {
    console.error("❌ Invalid canvasData:", canvasData);
    return null;
  }

  if (!data || !Array.isArray(data.objects)) {
    console.warn("⚠️ canvasData has no objects:", data);
    return null;
  }

  const width = data.width || 400;
  const height = data.height || 720;

  /* ================= RESPONSIVE SCALE ================= */
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;

      setScale(containerWidth / width);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [width]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full flex justify-center"
        style={{
          overflow: "visible",
        }}
      >
        <div
          style={{
            width: width * scale,
            height: height * scale,
            position: "relative",
          }}
        >
          {/* ================= K O N V A  ================= */}
          <Stage
            width={width * scale}
            height={height * scale}
            scaleX={scale}
            scaleY={scale}
            listening={false} // ❌ לא מאזין למגעים
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

          {/* ================= GLASS LAYER ================= */}
          {/* ⭐ זה מה שגורם לגלילה לעבוד על הקנבס עצמו */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "transparent",
              touchAction: "pan-y",
            }}
          />
        </div>
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
