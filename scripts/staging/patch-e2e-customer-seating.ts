import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGO_URI || "";
  if (!uri.includes("invistimo_staging")) {
    throw new Error("staging DB only");
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const tpl = await db
    .collection("venueseatingtemplates")
    .findOne({ name: /Template A1/ });
  const owner = await db
    .collection("users")
    .findOne({ email: "e2e-owner-a@invistimo.test" });
  const res = await db.collection("users").updateOne(
    { email: "e2e-customer-a@invistimo.test" },
    {
      $set: {
        venueSeatingTemplateId: tpl?._id,
        venueSeatingTemplateName: tpl?.name,
        venueOwnerId: owner?._id,
        includeSeating: true,
        includeDigitalSeating: true,
        venueClientSource: true,
        venueClientPackageType: "rsvp_seating",
        plan: "rsvp_seating",
        planLimits: { seatingEnabled: true },
        accessModules: { rsvpSeating: true, digitalSeating: true },
        venueHallId: "e2e-venue-a",
        venueClientHallId: "e2e-venue-a",
      },
    }
  );
  console.log(JSON.stringify({ ok: true, matched: res.matchedCount, tpl: String(tpl?._id) }));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
