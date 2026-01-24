import { Types } from "mongoose";
import EventSupplier from "@/models/EventSupplier";

/* =========================================================
   Sync Event Budget from Suppliers
   ⚠️ חישוב בלבד – לא מעדכן Event
========================================================= */
export async function syncEventBudget(eventId: Types.ObjectId) {
  if (!eventId) return;

  const suppliers = await EventSupplier.find({ eventId })
    .select("price")
    .lean<{ price?: number }[]>();

  const totalCommitments = suppliers.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );

  // 🟡 intentionally no Event update here
  // budgetTotal הוא ידני ונשלט רק ע"י PATCH /overview

  if (process.env.NODE_ENV !== "production") {
    console.log("🟡 syncEventBudget (calculated only):", {
      eventId: String(eventId),
      totalCommitments,
    });
  }

  return totalCommitments;
}
