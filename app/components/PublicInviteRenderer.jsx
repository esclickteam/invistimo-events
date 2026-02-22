"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";

/* ============================================================
   ✅ תמיד מציגים לאורח לאורך (PORTRAIT)
============================================================ */
const PORTRAIT_WIDTH = 400;
const PORTRAIT_HEIGHT = 720;

export default function PublicInviteRenderer({ canvasData }) {
  if (!canvasData) return null;

  let data;

  try {
    data = typeof canvasData === "string" ? JSON.parse(canvasData) : canvasData;
  } catch (err) {
    console.error("❌ Invalid canvasData:", canvasData);
    return null;
  }

  if (!data || !Array.isArray(data.objects)) {
    console.warn("⚠️ canvasData has no objects:", data);
    return null;
  }

  // נתוני מקור (מה שנשמר ב-DB)
  const sourceWidth = Number(data.width) || PORTRAIT_WIDTH;
  const sourceHeight = Number(data.height) || PORTRAIT_HEIGHT;

  const sourceOrientation =
    data.orientation === "landscape" || data.orientation === "portrait"
      ? data.orientation
      : sourceWidth > sourceHeight
      ? "landscape"
      : "portrait";

  // ✅ יעד תמיד PORTRAIT לאורח
  const targetWidth = PORTRAIT_WIDTH;
  const targetHeight = PORTRAIT_HEIGHT;

  /* ================= RESPONSIVE SCALE ================= */
  const containerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;

      // כדי שייכנס בול לרוחב המסך (בהזמנה לאורך)
      setFitScale(containerWidth / targetWidth);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [targetWidth]);

  /* ============================================================
     ✅ SCALE פנימי כדי להכניס LANDSCAPE לתוך PORTRAIT בלי חיתוך
  ============================================================ */
  const innerScale = useMemo(() => {
    if (sourceOrientation !== "landscape") return 1;

    // להכניס את כל הרוחב/גובה של המקור לתוך PORTRAIT
    const s = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    return s > 0 ? s : 1;
  }, [sourceOrientation, sourceWidth, sourceHeight, targetWidth, targetHeight]);

  // מרכזים את המקור בתוך המסגרת לאורך
  const offsetX = useMemo(() => {
    const scaledW = sourceWidth * innerScale;
    return (targetWidth - scaledW) / 2;
  }, [sourceWidth, innerScale, targetWidth]);

  const offsetY = useMemo(() => {
    const scaledH = sourceHeight * innerScale;
    return (targetHeight - scaledH) / 2;
  }, [sourceHeight, innerScale, targetHeight]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full flex justify-center"
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            width: targetWidth * fitScale,
            height: targetHeight * fitScale,
            position: "relative",
          }}
        >
          {/* ================= K O N V A  ================= */}
          <Stage
            width={targetWidth * fitScale}
            height={targetHeight * fitScale}
            // scale לפי המסך (רק להצגה)
            scaleX={fitScale}
            scaleY={fitScale}
            listening={false}
          >
            {/* Layer פנימי שמחזיק את כל המקור ומקטין אותו אם צריך */}
            <Layer x={offsetX} y={offsetY} scaleX={innerScale} scaleY={innerScale}>
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
                  // ✅ גם לוטי נכנס לתוך ה"סקייל הפנימי" + מרכז
                  top: (offsetY + obj.y * innerScale) * fitScale,
                  left: (offsetX + obj.x * innerScale) * fitScale,
                  width: obj.width * innerScale * fitScale,
                  height: obj.height * innerScale * fitScale,
                  pointerEvents: "none",
                }}
              >
                <Lottie animationData={obj.lottieData} />
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