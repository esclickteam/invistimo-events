import VenueAlert, { type VenueAlertTone, type VenueAlertType } from "@/models/VenueAlert";

type CreateVenueAlertInput = {
  ownerId: string;
  hallId?: string;
  title: string;
  description?: string;
  tone?: VenueAlertTone;
  type?: VenueAlertType;
};

export async function createVenueAlert(input: CreateVenueAlertInput) {
  const title = String(input.title || "").trim();
  if (!title) return null;

  return VenueAlert.create({
    ownerId: input.ownerId,
    hallId: input.hallId || undefined,
    title,
    description: String(input.description || "").trim(),
    tone: input.tone || "amber",
    type: input.type || "maintenance",
    read: false,
  });
}
