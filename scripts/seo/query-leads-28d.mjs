import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.log(JSON.stringify({ ok: false, reason: "no_mongo_uri" }));
  process.exit(0);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
const names = (await db.listCollections().toArray()).map((c) => c.name);
const cf = names.find((n) => /customerfile/i.test(n)) || "customerfiles";
const cim =
  names.find((n) => /contactinquirymeasurement/i.test(n)) ||
  "contactinquirymeasurements";

const lead28 = await db
  .collection(cf)
  .countDocuments({ status: "lead", createdAt: { $gte: since } });
const byProvider28 = await db
  .collection(cf)
  .aggregate([
    { $match: { status: "lead", createdAt: { $gte: since } } },
    {
      $group: {
        _id: { provider: "$leadProvider", source: "$leadSource" },
        n: { $sum: 1 },
      },
    },
    { $sort: { n: -1 } },
  ])
  .toArray();
const contactForm28 = await db.collection(cf).countDocuments({
  status: "lead",
  leadProvider: "contact_form",
  createdAt: { $gte: since },
});
const support28 = await db.collection(cf).countDocuments({
  status: "lead",
  leadProvider: "support_widget",
  createdAt: { $gte: since },
});
const website28 = await db.collection(cf).countDocuments({
  status: "lead",
  leadSource: "website",
  createdAt: { $gte: since },
});
const lead90 = await db
  .collection(cf)
  .countDocuments({ status: "lead", createdAt: { $gte: since90 } });

let mp28 = [];
try {
  mp28 = await db
    .collection(cim)
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ])
    .toArray();
} catch (e) {
  mp28 = [{ error: String(e.message) }];
}

const sample = await db
  .collection(cf)
  .find({ status: "lead", createdAt: { $gte: since } })
  .project({
    leadProvider: 1,
    leadSource: 1,
    formName: 1,
    createdAt: 1,
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();

console.log(
  JSON.stringify(
    {
      ok: true,
      collections: { cf, cim },
      lead28,
      lead90,
      contactForm28,
      support28,
      website28,
      byProvider28,
      mp28,
      sample,
    },
    null,
    2
  )
);

await mongoose.disconnect();
