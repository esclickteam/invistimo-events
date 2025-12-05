import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvityItem from "@/models/InvityItem"; // ניצור עוד רגע

// GET /api/invity/library/:type
export async function GET(req: Request, { params }: any) {
  const { type } = params;

  await dbConnect();

  const items = await InvityItem.find({ type }).lean();
  return NextResponse.json(items);
}

// POST /api/invity/library/:type
export async function POST(req: Request, { params }: any) {
  const { type } = params;
  await dbConnect();

  const data = await req.json();

  const item = await InvityItem.create({
    type,
    url: data.url,
    thumbnail: data.thumbnail ?? data.url,
    shapeData: data.shapeData ?? null,
    lottieData: data.lottieData ?? null,
  });

  return NextResponse.json(item);
}
