import "dotenv/config";

import mongoose from "mongoose";
import SeatingTable from "@/models/SeatingTable"; // ודאי שהנתיב נכון
import db from "@/lib/db";

/* ===============================
   Types (מינימליים למיגרציה)
=============================== */
type SeatedGuest = {
  arrived?: boolean;
};

type Table = {
  seatedGuests?: SeatedGuest[];
};

type SeatingTableDoc = {
  tables: Table[];
  save: () => Promise<void>;
};

/* ===============================
   Migration
=============================== */
async function migrate() {
  console.log("🚀 Starting migration: seatedGuests.arrived");

  await db();

  const docs = (await SeatingTable.find({
    "tables.seatedGuests": { $exists: true, $ne: [] },
  })) as SeatingTableDoc[];

  let updatedTables = 0;
  let updatedGuests = 0;

  for (const doc of docs) {
    let changed = false;

    doc.tables.forEach((table: Table) => {
      table.seatedGuests?.forEach((sg: SeatedGuest) => {
        if (typeof sg.arrived !== "boolean") {
          sg.arrived = false;
          updatedGuests++;
          changed = true;
        }
      });
    });

    if (changed) {
      await doc.save();
      updatedTables++;
    }
  }

  console.log("✅ Migration finished");
  console.log(`🪑 Tables updated: ${updatedTables}`);
  console.log(`👤 SeatedGuests updated: ${updatedGuests}`);

  process.exit(0);
}

/* ===============================
   Run
=============================== */
migrate().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
