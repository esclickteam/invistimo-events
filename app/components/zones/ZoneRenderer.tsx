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

  /* ================= Attach Transformer ================= */
  useEffect(() => {
    if (!shapeRef.current || !trRef.current) return;

    trRef.current.nodes([shapeRef.current]);
    trRef.current.getLayer()?.batchDraw();
  }, [zone.id]);

  return (
    <>
      <Group
        x={zone.x}
        y={zone.y}
        rotation={zone.rotation}
        draggable={!zone.locked}
        onDragEnd={(e) => {
          updateZone(zone.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onClick={(e) => {
          e.cancelBubble = true;

          if (!shapeRef.current || !trRef.current) return;
          trRef.current.nodes([shapeRef.current]);
          trRef.current.getLayer()?.batchDraw();
        }}
      >
        <Rect
          ref={shapeRef}
          width={zone.width}
          height={zone.height}
          fill={zone.color}
          opacity={zone.opacity}
          cornerRadius={16}
          stroke="#374151"
          strokeWidth={1}
          draggable={false}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            updateZone(zone.id, {
              width: Math.max(80, node.width() * scaleX),
              height: Math.max(60, node.height() * scaleY),
              rotation: node.rotation(),
            });
          }}
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

      <Transformer
        ref={trRef}
        rotateEnabled
        enabledAnchors={[
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ]}
        boundBoxFunc={(oldBox, newBox) => {
          if (newBox.width < 80 || newBox.height < 60) {
            return oldBox;
          }
          return newBox;
        }}
      />
    </>
  );
}
