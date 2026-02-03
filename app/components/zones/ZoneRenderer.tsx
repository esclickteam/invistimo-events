"use client";

import { useEffect, useRef } from "react";
import { Group, Rect, Text, Transformer, Image as KonvaImage } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
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

  /* =========================
     📐 חישוב מרכז לטקסט + אייקון
     ========================= */
  const TEXT_SIZE = 18;
  const ICON_SIZE = 28;
  const GAP = 6;

  const contentHeight = TEXT_SIZE + GAP + ICON_SIZE;
  const contentY = zone.height / 2 - contentHeight / 2;

  /* =========================
     🖼️ SVG / Emoji handling
     ========================= */
  const isSvgIcon =
  typeof zone.icon === "string" &&
  zone.icon.trim().toLowerCase().endsWith(".svg");

const [iconImage] = useImage(isSvgIcon ? zone.icon : "");

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
          cornerRadius={zone.borderRadius ?? Math.min(32, zone.height / 4)}
          fill={zone.gradient ? undefined : zone.color}
          fillLinearGradientStartPoint={
            zone.gradient ? { x: 0, y: 0 } : undefined
          }
          fillLinearGradientEndPoint={
            zone.gradient ? { x: 0, y: zone.height } : undefined
          }
          fillLinearGradientColorStops={
            zone.gradient
              ? [0, zone.gradient[0], 1, zone.gradient[1]]
              : undefined
          }
          shadowEnabled
          shadowColor="rgba(0,0,0,0.22)"
          shadowBlur={20}
          shadowOffset={{ x: 0, y: 8 }}
          shadowOpacity={0.45}
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

        {/* 🧩 טקסט + אייקון (ממורכזים כיחידה אחת) */}
        <Group x={0} y={contentY} width={zone.width} listening={false}>
          {/* 📝 שם האזור */}
          <Text
            text={zone.name}
            width={zone.width}
            align="center"
            fontSize={TEXT_SIZE}
            fontStyle="bold"
            fill="#ffffff"
            shadowColor="rgba(0,0,0,0.35)"
            shadowBlur={4}
            shadowOffset={{ x: 0, y: 1 }}
            shadowOpacity={0.9}
          />

          {/* 👥 אייקון – SVG או Emoji */}
          {isSvgIcon && iconImage ? (
            <KonvaImage
              image={iconImage}
              x={zone.width / 2 - ICON_SIZE / 2}
              y={TEXT_SIZE + GAP}
              width={ICON_SIZE}
              height={ICON_SIZE}
            />
          ) : (
            <Text
              text={zone.icon}
              y={TEXT_SIZE + GAP}
              width={zone.width}
              align="center"
              fontSize={ICON_SIZE}
              fill="#ffffff"
              shadowColor="rgba(0,0,0,0.35)"
              shadowBlur={6}
              shadowOffset={{ x: 0, y: 2 }}
              shadowOpacity={0.9}
            />
          )}
        </Group>
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          anchorSize={7}
          anchorCornerRadius={1}
          anchorFill="#e5f0ff"
          anchorStroke="#3b82f6"
          anchorStrokeWidth={1}
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          rotateAnchorOffset={18}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 120 || newBox.height < 80) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
