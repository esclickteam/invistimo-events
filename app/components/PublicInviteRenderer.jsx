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

  const width = data.width || 400;
  const height = data.height || 720;
  const isLandscape = width > height;

  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth) return;

      if (!isLandscape) {
        // PORTRAIT רגיל
        setScale(containerWidth / width);
        setOffsetX(0);
        setOffsetY(0);
      } else {
        // יחס פוסט אינסטגרם 4:5
        const targetHeight = containerWidth * 1.25;

        const scaleX = containerWidth / width;
        const scaleY = targetHeight / height;

        const fitScale = Math.min(scaleX, scaleY);

        setScale(fitScale);

        const renderedWidth = width * fitScale;
        const renderedHeight = height * fitScale;

        setOffsetX((containerWidth - renderedWidth) / 2);
        setOffsetY((targetHeight - renderedHeight) / 2);
      }
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [width, height, isLandscape]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-md relative"
        style={{
          aspectRatio: isLandscape ? "4 / 5" : "auto",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: offsetX,
          }}
        >
          <Stage
            width={width}
            height={height}
            scaleX={scale}
            scaleY={scale}
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