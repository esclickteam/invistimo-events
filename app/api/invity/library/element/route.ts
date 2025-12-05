import { NextResponse } from "next/server";

let elements: any[] = [];

export async function GET() {
  return NextResponse.json(elements);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    elements.push(body);
    return NextResponse.json(body, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
