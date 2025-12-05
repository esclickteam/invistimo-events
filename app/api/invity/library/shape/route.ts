import { NextResponse } from "next/server";

let shapes: any[] = []; // מאגר זמני

export async function GET() {
  return NextResponse.json(shapes); // מחזיר את כל הצורות
}

export async function POST(req: Request) {
  try {
    const body = await req.json(); // JSON מהבקשה
    shapes.push(body); // מוסיף למאגר
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
