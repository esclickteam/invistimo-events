"use client";
import { Image } from "react-konva";
import { useEffect, useState } from "react";

export default function URLImage({ data }) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    const image = new window.Image();
    image.crossOrigin = "Anonymous";
    image.src = data.url;
    image.onload = () => setImg(image);
  }, [data.url]);

  return (
    <Image
      image={img}
      x={data.x}
      y={data.y}
      width={data.width}
      height={data.height}
      opacity={data.opacity ?? 1}
    />
  );
}
