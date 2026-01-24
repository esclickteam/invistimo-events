import { Types } from "mongoose";
import EventSupplier from "@/models/EventSupplier";
import Event from "@/models/Event";

/* =========================================================
   Sync Event Budget from Suppliers
========================================================= */
export async function syncEventBudget(eventId: Types.ObjectId) {
  if (!eventId) return;

  const suppliers = await EventSupplier.find({ eventId })
    .select("price")
    .lean<{ price?: number }[]>();

  const total = suppliers.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );

  await Event.findByIdAndUpdate(eventId, {
    $set: { budgetTotal: total },
  });
}
