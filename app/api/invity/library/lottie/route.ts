import { NextResponse } from "next/server";

let lotties: any[] = [];

export async function GET() {
  return NextResponse.json(lotties);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    lotties.push(body);
    return NextResponse.json(body, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
