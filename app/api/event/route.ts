import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/auth";

/* ============================================================
   GET – שליפת אירוע קיים (או יצירת ברירת מחדל ריקה)
============================================================ */
export async function GET(req: Request) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(req);

    let event = await Event.findOne({ userId });

    // ✅ אם אין אירוע בכלל, נחזיר אובייקט ריק (כדי שהטופס ייטען ריק ולא "לא נמצאה הזמנה")
    if (!event) {
      return NextResponse.json({
        success: true,
        event: {
          title: "",
          date: "",
          location: "",
          eventType: "wedding",
          maxGuests: 0,
        },
      });
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* ============================================================
   POST – שמירת אירוע: אם לא קיים ניצור, אם קיים נעדכן
============================================================ */
export async function POST(req: Request) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(req);
    const body = await req.json();

    let event = await Event.findOne({ userId });

    if (!event) {
      // 🆕 יצירת אירוע חדש אם אין
      event = await Event.create({
        userId,
        ...body,
        status: "draft", // מסמן שהאירוע טרם נשלח או הושלם
        createdAt: new Date(),
      });
    } else {
      // ✏️ עדכון אם קיים
      Object.assign(event, body);
      await event.save();
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
