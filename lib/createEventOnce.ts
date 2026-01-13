import connectDB from "@/lib/mongodb";
import Event from "@/models/Event";
import User from "@/models/User";

type CreateEventOnceParams = {
  email: string;
  maxGuests: number;
  stripeSessionId?: string; // אופציונלי – רק אם הגיע מ-Stripe
};

export async function createEventOnce({
  email,
  maxGuests,
  stripeSessionId,
}: CreateEventOnceParams) {
  await connectDB();

  /* ============================================================
     Find user
  ============================================================ */
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new Error("User not found for createEventOnce");
  }

  /* ============================================================
     Check if event already exists
     (אירוע אחד פעיל לכל משתמש)
  ============================================================ */
  const existingEvent = await Event.findOne({
    userId: user._id,
    status: "active",
  });

  if (existingEvent) {
    return existingEvent;
  }

  /* ============================================================
     Build event payload (⚠️ בלי null / "")
  ============================================================ */
  const eventData: any = {
    userId: user._id,
    email: user.email,
    eventType: "wedding",
    title: "",
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    time: "",
    maxGuests,
    zones: [],
    status: "active",
  };

  // Stripe – רק אם באמת קיים
  if (stripeSessionId) {
    eventData.stripeSessionId = stripeSessionId;
  }

  /* ============================================================
     Create event
  ============================================================ */
  const event = await Event.create(eventData);

  return event;
}