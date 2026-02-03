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

  /* 🔗 חיבור Transformer ל־Rect */
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
  onDragEnd={(e) => {
    updateZone(zone.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  }}
>
  {/* ⬛ RECT – זה היחיד שעובר resize */}
  <Rect
    ref={rectRef}
    width={zone.width}
    height={zone.height}
    fill={zone.color}
    opacity={zone.opacity}
    cornerRadius={Math.min(24, zone.height / 4)} // UX רך
    stroke={isSelected ? "#2563eb" : "transparent"}
    strokeWidth={2}
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

  {/* 🧠 TEXT – תמיד באמצע, לא מושפע מגודל */}
  <Text
  text={`${zone.icon} ${zone.name}`}
  width={zone.width}
  height={zone.height}
  align="center"
  verticalAlign="middle"
  fontSize={18}
  fontStyle="bold"
  fill="#111827"
  listening={false}
/>
</Group>


      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotationSnaps={[]} // 🌀 סיבוב חופשי
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
            // ⛔ מינימום גודל
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
