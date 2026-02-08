"use client";

import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";
import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   PUBLIC INVITE RENDERER
   ✅ Fixes preview clipping by scaling object coordinates/sizes
   ✅ No Stage scaleX/scaleY (prevents bottom cut)
============================================================ */
export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData) return null;

  let data;
  try {
    data = typeof canvasData === "string" ? JSON.parse(canvasData) : canvasData;
  } catch (err) {
    console.error("❌ Invalid canvasData:", canvasData, err);
    return null;
  }

  if (!data || !Array.isArray(data.objects)) {
    console.warn("⚠️ canvasData has no objects:", data);
    return null;
  }

  const width = Number(data.width) || 400;
  const height = Number(data.height) || 720;

  /* ================= RESPONSIVE SCALE ================= */
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;

      // Optional: prevent upscale above 1 if you want original quality only:
      // setScale(Math.min(containerWidth / width, 1));
      setScale(containerWidth / width);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [width]);

  const stageWidth = useMemo(() => width * scale, [width, scale]);
  const stageHeight = useMemo(() => height * scale, [height, scale]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-[400px] flex justify-center"
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            width: stageWidth,
            height: stageHeight,
            position: "relative",
          }}
        >
          {/* ================= K O N V A ================= */}
          <Stage width={stageWidth} height={stageHeight} listening={false}>
            <Layer>
              {data.objects.map((obj) => {
                if (!obj || !obj.type) return null;

                if (obj.type === "rect") {
                  return (
                    <Rect
                      key={obj.id}
                      x={(obj.x || 0) * scale}
                      y={(obj.y || 0) * scale}
                      width={(obj.width || 0) * scale}
                      height={(obj.height || 0) * scale}
                      fill={obj.fill || "#ffffff"}
                      opacity={obj.opacity ?? 1}
                      cornerRadius={(obj.cornerRadius || 0) * scale}
                      rotation={obj.rotation || 0}
                    />
                  );
                }

                if (obj.type === "circle") {
                  const radius = obj.radius || 0;
                  return (
                    <Rect
                      key={obj.id}
                      x={(obj.x || 0) * scale}
                      y={(obj.y || 0) * scale}
                      width={radius * 2 * scale}
                      height={radius * 2 * scale}
                      cornerRadius={radius * scale}
                      fill={obj.fill || "#000"}
                      opacity={obj.opacity ?? 1}
                      rotation={obj.rotation || 0}
                    />
                  );
                }

                if (obj.type === "image") {
                  return <PreviewImage key={obj.id} obj={obj} scale={scale} />;
                }

                if (obj.type === "text") {
                  return (
                    <Text
                      key={obj.id}
                      x={(obj.x || 0) * scale}
                      y={(obj.y || 0) * scale}
                      text={obj.text || ""}
                      fontSize={(obj.fontSize || 40) * scale}
                      fontFamily={obj.fontFamily || "Arial"}
                      fill={obj.fill || "#000"}
                      width={obj.width ? obj.width * scale : undefined}
                      align={obj.align || "center"}
                      opacity={obj.opacity ?? 1}
                      rotation={obj.rotation || 0}
                      lineHeight={obj.lineHeight || 1.2}
                      padding={(obj.padding || 0) * scale}
                    />
                  );
                }

                return null;
              })}
            </Layer>
          </Stage>

          {/* ================= LOTTIE (HTML Overlay) ================= */}
          {data.objects
            .filter((o) => o?.type === "lottie")
            .map((obj) => (
              <div
                key={obj.id}
                style={{
                  position: "absolute",
                  top: (obj.y || 0) * scale,
                  left: (obj.x || 0) * scale,
                  width: (obj.width || 0) * scale,
                  height: (obj.height || 0) * scale,
                  pointerEvents: "none",
                }}
              >
                <Lottie
                  animationData={obj.lottieData}
                  loop={obj.loop ?? true}
                  autoplay={obj.autoplay ?? true}
                />
              </div>
            ))}

          {/* ================= GLASS LAYER ================= */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "transparent",
              touchAction: "pan-y",
              pointerEvents: "none", // אם את רוצה שלא יחסום שום לחיצות
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
function PreviewImage({ obj, scale }) {
  const [image] = useImage(obj?.url || "", "anonymous");
  if (!image) return null;

  return (
    <KonvaImage
      x={(obj.x || 0) * scale}
      y={(obj.y || 0) * scale}
      width={(obj.width || 0) * scale}
      height={(obj.height || 0) * scale}
      image={image}
      opacity={obj.opacity ?? 1}
      rotation={obj.rotation || 0}
    />
  );
}
