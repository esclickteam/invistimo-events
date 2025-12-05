import { NextResponse } from "next/server";

let animations: any[] = [];

export async function GET() {
  return NextResponse.json(animations);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    animations.push(body);
    return NextResponse.json(body, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
