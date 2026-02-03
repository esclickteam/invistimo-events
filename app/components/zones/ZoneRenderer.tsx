"use client";

import { useEffect, useRef } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import { Zone, useZoneStore } from "@/store/zoneStore";

type Props = {
  zone: Zone;
};

export default function ZoneRenderer({ zone }: Props) {
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const updateZone = useZoneStore((s) => s.updateZone);
  const resizeZone = useZoneStore((s) => s.resizeZone);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  const isSelected = selectedZoneId === zone.id;

  /* 🔗 חיבור Transformer ל־Rect בלבד */
  useEffect(() => {
    if (!isSelected) return;
    if (rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        x={zone.x}
        y={zone.y}
        rotation={zone.rotation || 0}
        draggable={!zone.locked}
        onClick={(e) => {
          e.cancelBubble = true;
          setSelectedZone(zone.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          setSelectedZone(zone.id);
        }}
        onDragEnd={(e) => {
          updateZone(zone.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
      >
        {/* ⬛ אזור */}
        <Rect
          ref={rectRef}
          width={zone.width}
          height={zone.height}
          opacity={zone.opacity}
          cornerRadius={
            zone.borderRadius ?? Math.min(32, zone.height / 4)
          }
          fill={
            zone.gradient ? undefined : zone.color
          }
          fillLinearGradientStartPoint={
            zone.gradient ? { x: 0, y: 0 } : undefined
          }
          fillLinearGradientEndPoint={
            zone.gradient
              ? { x: zone.width, y: zone.height }
              : undefined
          }
          fillLinearGradientColorStops={
            zone.gradient
              ? [0, zone.gradient[0], 1, zone.gradient[1]]
              : undefined
          }
          shadowEnabled={zone.shadow}
          shadowColor="rgba(0,0,0,0.25)"
          shadowBlur={18}
          shadowOffset={{ x: 0, y: 6 }}
          shadowOpacity={0.35}
          stroke={isSelected ? "#2563eb" : "transparent"}
          strokeWidth={isSelected ? 2 : 0}
          onTransformEnd={() => {
            const node = rectRef.current;
            if (!node) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            resizeZone(
              zone.id,
              Math.max(120, node.width() * scaleX),
              Math.max(80, node.height() * scaleY)
            );
          }}
        />

        {/* 🧠 טקסט – תמיד באמצע, לא זז */}
        <Text
  text={`${zone.icon} ${zone.name}`}
  x={zone.width / 2}
  y={zone.height / 2}
  offsetX={zone.width / 2}
  offsetY={zone.height / 2}
  width={zone.width}
  height={zone.height}
  align="center"
  fontSize={18}
  fontStyle="bold"
  fill="#ffffff"
  listening={false}
/>

      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          anchorSize={14}
          borderStroke="#2563eb"
          borderStrokeWidth={1.5}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 120 || newBox.height < 80) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
