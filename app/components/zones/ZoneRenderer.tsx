"use client";

import { useEffect, useRef } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import { Zone, useZoneStore } from "@/store/zoneStore";

type Props = {
  zone: Zone;
};

export default function ZoneRenderer({ zone }: Props) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  const updateZone = useZoneStore((s) => s.updateZone);
  const selectedZoneId = useZoneStore((s) => s.selectedZoneId);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  const isSelected = selectedZoneId === zone.id;

  /* ================= Attach Transformer ONLY if selected ================= */
  useEffect(() => {
    if (!isSelected || !shapeRef.current || !trRef.current) return;

    trRef.current.nodes([shapeRef.current]);
    trRef.current.getLayer()?.batchDraw();
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
        onDragStart={(e) => {
          // ❗ קריטי: מונע מה־Stage לזוז
          e.cancelBubble = true;
        }}
        onDragMove={(e) => {
          // ❗ מונע bubbling גם בזמן גרירה
          e.cancelBubble = true;
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
          ref={shapeRef}
          width={zone.width}
          height={zone.height}
          fill={zone.color}
          opacity={zone.opacity}
          cornerRadius={16}
          stroke={isSelected ? "#2563eb" : "#374151"}
          strokeWidth={isSelected ? 2 : 1}
          draggable={false}
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
          rotateEnabled
          rotationSnaps={[]} // ✅ סיבוב חופשי בלי "קפיצות"
          enabledAnchors={[]} // ✅ מבטל שינוי גודל לגמרי (רק סיבוב)
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;

            // ✅ שומרים רק זווית (לא נוגעים ברוחב/גובה בכלל)
            updateZone(zone.id, {
              rotation: node.rotation(),
            });
          }}
        />
      )}
    </>
  );
}
