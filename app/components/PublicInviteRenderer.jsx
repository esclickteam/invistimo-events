"use client";

import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";
import { useEffect, useRef, useState } from "react";

/* ============================================================
   📐 helper: contain (בלי חיתוך)
============================================================ */
function getContainRect({ canvasWidth, canvasHeight, imageWidth, imageHeight }) {
  const scale = Math.min(
    canvasWidth / imageWidth,
    canvasHeight / imageHeight
  );

  const width = imageWidth * scale;
  const height = imageHeight * scale;

  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;

  return { x, y, width, height };
}

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

  if (!data || !Array.isArray(data.objects)) return null;

  const width = data.width || 400;

  /* ================= 👇 גובה דינמי לפי תמונה ================= */
  const [dynamicHeight, setDynamicHeight] = useState(data.height || 720);

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

  /* ================= 👇 התאמת גובה לפי תמונת רקע ================= */
  useEffect(() => {
    const bg = data.objects.find(
      (o) => o.type === "image" && o.isBackground
    );

    if (!bg) return;

    const img = new window.Image();
    img.src = bg.url;

    img.onload = () => {
      const ratio = img.height / img.width;
      setDynamicHeight(width * ratio);
    };
  }, [data, width]);

  const backgroundImages = data.objects.filter(
    (o) => o.type === "image" && o.isBackground === true
  );

  const otherObjects = data.objects.filter(
    (o) => !(o.type === "image" && o.isBackground === true)
  );

  return (
    <div className="w-full flex justify-center">
      <div ref={containerRef} className="w-full flex justify-center">
        <div
          style={{
            width: width * scale,
            height: dynamicHeight * scale,
            position: "relative",
          }}
        >
          <Stage
            width={width * scale}
            height={dynamicHeight * scale}
            scaleX={scale}
            scaleY={scale}
            listening={false}
          >
            <Layer>
              {/* ===== רקע ===== */}
              {backgroundImages.map((obj) => (
                <PreviewImage
                  key={obj.id}
                  obj={obj}
                  canvasWidth={width}
                  canvasHeight={dynamicHeight}
                />
              ))}

              {/* ===== שאר האלמנטים ===== */}
              {otherObjects.map((obj) => {
                if (obj.type === "rect") {
                  return (
                    <Rect
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      width={obj.width}
                      height={obj.height}
                      fill={obj.fill || "#fff"}
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
                  return (
                    <PreviewImage
                      key={obj.id}
                      obj={obj}
                      canvasWidth={width}
                      canvasHeight={dynamicHeight}
                    />
                  );
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

          {/* ===== LOTTIE ===== */}
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

          {/* ===== GLASS ===== */}
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
   🖼 IMAGE
============================================================ */
function PreviewImage({ obj, canvasWidth, canvasHeight }) {
  const [image] = useImage(obj.url, "anonymous");
  if (!image) return null;

  /* ===== BACKGROUND → contain (בלי חיתוך) ===== */
  if (obj.isBackground === true) {
    const rect = getContainRect({
      canvasWidth,
      canvasHeight,
      imageWidth: image.width,
      imageHeight: image.height,
    });

    return (
      <KonvaImage
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        image={image}
        opacity={obj.opacity ?? 1}
      />
    );
  }

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