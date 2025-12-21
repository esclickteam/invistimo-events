"use client";

import { useEffect, useRef } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import { Zone, useZoneStore } from "@/store/zoneStore";

type Props = {
  zone: Zone;
};

export default function ZoneRenderer({ zone }: Props) {
  const groupRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  const updateZone = useZoneStore((s) => s.updateZone);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  const isSelected = selectedZoneId === zone.id;

  /* חיבור Transformer רק כשנבחר */
  useEffect(() => {
    if (isSelected && groupRef.current && trRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        ref={groupRef}
        x={zone.x}
        y={zone.y}
        rotation={zone.rotation || 0}
        draggable={!zone.locked}
        onClick={(e) => {
          e.cancelBubble = true;
          setSelectedZone(zone.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true; // 👈 חובה למובייל
          setSelectedZone(zone.id);
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          updateZone(zone.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
      >
        <Rect
          width={zone.width}
          height={zone.height}
          fill={zone.color}
          opacity={zone.opacity}
          cornerRadius={16}
          stroke={isSelected ? "#2563eb" : "#374151"}
          strokeWidth={isSelected ? 2 : 1}
        />

        <Text
          text={`${zone.icon} ${zone.name}`}
          fontSize={18}
          fill="#111827"
          width={zone.width}
          height={zone.height}
          align="center"
          verticalAlign="middle"
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
          ]}
          anchorSize={16} // 👆 נוח גם למובייל
          borderStroke="#2563eb"
          boundBoxFunc={(oldBox, newBox) => {
            // ⛔ מינימום גודל
            if (newBox.width < 120 || newBox.height < 80) {
              return oldBox;
            }
            return newBox;
          }}
          onTransformEnd={() => {
            const node = groupRef.current;
            if (!node) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            // ⚠️ מנקים scale כדי לא לשבור future transforms
            node.scaleX(1);
            node.scaleY(1);

            updateZone(zone.id, {
              width: Math.max(120, zone.width * scaleX),
              height: Math.max(80, zone.height * scaleY),
              rotation: node.rotation(),
            });
          }}
        />
      )}
    </>
  );
}
