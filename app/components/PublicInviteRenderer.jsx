"use client";

import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import Lottie from "lottie-react";
import useImage from "use-image";
import { useEffect, useRef, useState } from "react";

/* ============================================================
   📐 helper: background-size: cover for Konva
============================================================ */
function getCoverRect({ canvasWidth, canvasHeight, imageWidth, imageHeight }) {
  const scale = Math.max(
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
  } catch {
    return null;
  }

  if (!data || !Array.isArray(data.objects)) return null;

  /* ============================================================
     🧩 CANVAS MODES
  ============================================================ */
  const CANVAS_MODES = {
    vertical: {
      width: data.width || 400,
      height: data.height || 720,
    },
    square: {
      width: 1080,
      height: 1080,
    },
  };

  const [canvasMode, setCanvasMode] = useState("vertical");

  const targetWidth = CANVAS_MODES[canvasMode].width;
  const targetHeight = CANVAS_MODES[canvasMode].height;

  /* ============================================================
     🔁 FIT ORIGINAL INVITE INTO TARGET CANVAS
  ============================================================ */
  const originalWidth = data.width || 400;
  const originalHeight = data.height || 720;

  const fitScale = Math.min(
    targetWidth / originalWidth,
    targetHeight / originalHeight
  );

  const offsetX = (targetWidth - originalWidth * fitScale) / 2;
  const offsetY = (targetHeight - originalHeight * fitScale) / 2;

  /* ================= VIEWPORT RESPONSIVE SCALE ================= */
  const containerRef = useRef(null);
  const [viewportScale, setViewportScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      if (!w) return;
      setViewportScale(w / targetWidth);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [targetWidth]);

  const backgroundImages = data.objects.filter(
    (o) => o.type === "image" && o.isBackground === true
  );

  const otherObjects = data.objects.filter(
    (o) => !(o.type === "image" && o.isBackground === true)
  );

  return (
    <div className="w-full">
      {/* ================= CANVAS SIZE SWITCH ================= */}
      <div className="flex justify-center gap-3 mb-3">
        <button
          onClick={() => setCanvasMode("vertical")}
          style={{
            fontWeight: canvasMode === "vertical" ? "bold" : "normal",
          }}
        >
          הזמנה רגילה
        </button>
        <button
          onClick={() => setCanvasMode("square")}
          style={{
            fontWeight: canvasMode === "square" ? "bold" : "normal",
          }}
        >
          פוסט ריבועי
        </button>
      </div>

      <div ref={containerRef} className="w-full flex justify-center">
        <div
          style={{
            width: targetWidth * viewportScale,
            height: targetHeight * viewportScale,
            position: "relative",
          }}
        >
          <Stage
            width={targetWidth * viewportScale}
            height={targetHeight * viewportScale}
            scaleX={viewportScale}
            scaleY={viewportScale}
            listening={false}
          >
            {/* ===== INVITE LAYER (FITTED) ===== */}
            <Layer
              x={offsetX}
              y={offsetY}
              scaleX={fitScale}
              scaleY={fitScale}
            >
              {/* BACKGROUND */}
              {backgroundImages.map((obj) => (
                <PreviewImage
                  key={obj.id}
                  obj={obj}
                  canvasWidth={originalWidth}
                  canvasHeight={originalHeight}
                />
              ))}

              {/* OBJECTS */}
              {otherObjects.map((obj) => {
                if (obj.type === "rect") {
                  return <Rect key={obj.id} {...obj} />;
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
                      canvasWidth={originalWidth}
                      canvasHeight={originalHeight}
                    />
                  );
                }

                if (obj.type === "text") {
                  return <Text key={obj.id} {...obj} />;
                }

                return null;
              })}
            </Layer>
          </Stage>
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

  if (obj.isBackground === true) {
    const cover = getCoverRect({
      canvasWidth,
      canvasHeight,
      imageWidth: image.width,
      imageHeight: image.height,
    });

    return <KonvaImage {...cover} image={image} opacity={obj.opacity ?? 1} />;
  }

  return <KonvaImage {...obj} image={image} />;
}