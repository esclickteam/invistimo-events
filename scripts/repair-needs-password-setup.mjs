import mongoose from "mongoose";
import { readFileSync } from "fs";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional local env file
  }
}

loadEnvFile(".env.vercel.prod");
loadEnvFile(".env.local");

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGO_URI");
}

await mongoose.connect(uri);

const res = await mongoose.connection.collection("users").updateMany(
  {
    needsPasswordSetup: true,
    password: { $type: "string", $ne: "" },
  },
  { $set: { needsPasswordSetup: false } },
);

console.log("repaired", res.modifiedCount);
await mongoose.disconnect();
