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

  /* חיבור ה-Transformer רק כשנבחר */
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
        onDragStart={(e) => (e.cancelBubble = true)}
        onDragMove={(e) => (e.cancelBubble = true)}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          updateZone(zone.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;

          // ✅ נשמרת רק הזווית החדשה, בלי לשנות כלום אחר
          updateZone(zone.id, {
            rotation: node.rotation(),
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
          enabledAnchors={[]} // ❗ אין שינוי גודל
          anchorSize={8}
          borderStroke="#2563eb"
        />
      )}
    </>
  );
}
