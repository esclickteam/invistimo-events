import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import VenueHall from "@/models/VenueHall";
import VenueEvent from "@/models/VenueEvent";
import VenueTask from "@/models/VenueTask";
import VenueAlert from "@/models/VenueAlert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const ownerId = auth.userId;

    const hallsCount = await VenueHall.countDocuments({ ownerId });

    if (hallsCount === 0) {
      await VenueHall.insertMany([
        {
          ownerId,
          id: "main-gold-hall",
          name: "אולם הזהב",
          subtitle: "האולם המרכזי",
          capacity: 420,
          monthlyEvents: 18,
          upcomingEvents: 11,
          occupancyRate: 84,
          monthlyRevenue: 486000,
          nextEventAt: "היום 19:30",
          status: "active",
          image:
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
        },
        {
          ownerId,
          id: "garden-hall",
          name: "גן אירועים",
          subtitle: "מתחם חוץ וקבלת פנים",
          capacity: 320,
          monthlyEvents: 12,
          upcomingEvents: 9,
          occupancyRate: 72,
          monthlyRevenue: 318000,
          nextEventAt: "מחר 20:00",
          status: "active",
          image:
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
        },
        {
          ownerId,
          id: "sky-hall",
          name: "SKY Hall",
          subtitle: "אולם בוטיק",
          capacity: 180,
          monthlyEvents: 9,
          upcomingEvents: 6,
          occupancyRate: 61,
          monthlyRevenue: 196000,
          nextEventAt: "24.05 20:30",
          status: "maintenance",
          image:
            "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
        },
      ]);
    }

    const todayIso = new Date().toISOString().slice(0, 10);

    const eventsCount = await VenueEvent.countDocuments({ ownerId });

    if (eventsCount === 0) {
      await VenueEvent.insertMany([
        {
          ownerId,
          hallId: "main-gold-hall",
          hallName: "אולם הזהב",
          eventName: "אירוע ערב",
          date: todayIso,
          time: "19:30",
          status: "preparing",
          expectedGuests: 420,
          revenue: 145000,
        },
        {
          ownerId,
          hallId: "garden-hall",
          hallName: "גן אירועים",
          eventName: "אירוע חברה",
          date: todayIso,
          time: "20:00",
          status: "confirmed",
          expectedGuests: 280,
          revenue: 92000,
        },
        {
          ownerId,
          hallId: "sky-hall",
          hallName: "SKY Hall",
          eventName: "כנס עסקי",
          date: todayIso,
          time: "20:30",
          status: "confirmed",
          expectedGuests: 160,
          revenue: 68000,
        },
      ]);
    }

    const tasksCount = await VenueTask.countDocuments({ ownerId });

    if (tasksCount === 0) {
      await VenueTask.insertMany([
        {
          ownerId,
          title: "בדיקת תאורה וסאונד באולם הזהב",
          area: "תפעול",
          due: "היום 16:00",
          priority: "high",
          done: false,
        },
        {
          ownerId,
          title: "אישור סידור שולחנות מול צוות האולם",
          area: "ניהול אולם",
          due: "היום 18:00",
          priority: "medium",
          done: false,
        },
        {
          ownerId,
          title: "בדיקת מלאי בר ומשקאות",
          area: "מחסן",
          due: "מחר",
          priority: "medium",
          done: true,
        },
        {
          ownerId,
          title: "טיפול בתקלה במקרן SKY Hall",
          area: "תחזוקה",
          due: "עד 12:00",
          priority: "high",
          done: false,
        },
      ]);
    }

    const alertsCount = await VenueAlert.countDocuments({ ownerId });

    if (alertsCount === 0) {
      await VenueAlert.insertMany([
        {
          ownerId,
          type: "maintenance",
          title: "SKY Hall מסומן בתחזוקה",
          description: "מומלץ לוודא שהתקלה נסגרת לפני האירוע הבא.",
          tone: "amber",
          read: false,
        },
        {
          ownerId,
          type: "payments",
          title: "יתרה לגבייה מ־4 אירועים",
          description: "קיימים תשלומים פתוחים שטרם הושלמו.",
          tone: "rose",
          read: false,
        },
        {
          ownerId,
          type: "staff",
          title: "בדיקת כוח אדם לאירועי סוף השבוע",
          description: "כדאי לוודא שכל משמרות הצוות משויכות לאולמות.",
          tone: "violet",
          read: false,
        },
        {
          ownerId,
          type: "menu",
          title: "בדיקת מלאי לפני סוף שבוע",
          description: "עומס אירועים גבוה ביום חמישי ושישי.",
          tone: "emerald",
          read: false,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "נתוני דמו לדשבורד בעלים נוצרו בהצלחה",
    });
  } catch (error) {
    console.error("POST /api/venues/dashboard/seed failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "יצירת נתוני דמו נכשלה",
      },
      { status: 500 }
    );
  }
}