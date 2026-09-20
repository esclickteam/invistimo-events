import mongoose from "mongoose";
import { assertEnvironmentSafety } from "@/lib/env/safetyGuards";

type DbCache = {
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __invistimoDbCache: DbCache | undefined;
}

function getMongoUri() {
  return String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
}

function getCache(): DbCache {
  if (!global.__invistimoDbCache) {
    global.__invistimoDbCache = { promise: null };
  }
  return global.__invistimoDbCache;
}

export const connectDB = async () => {
  const MONGO_URI = getMongoUri();
  if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI is missing from environment variables!");
  }

  // Isolation guards before any DB traffic
  assertEnvironmentSafety({ throwOnError: true });

  // Already connected and the native driver is available
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return;
  }

  const cached = getCache();

  // Share one in-flight connect across concurrent API handlers.
  // readyState === 2 (connecting) previously returned early and left
  // mongoose.connection.db null → DATABASE_NOT_READY on parallel fetches.
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI)
      .then((connection) => {
        console.log("✅ MongoDB connected", {
          db: mongoose.connection.name || "(from URI)",
        });
        return connection;
      })
      .catch((error) => {
        cached.promise = null;
        console.error("❌ MongoDB connection error:", error);
        throw error;
      });
  }

  await cached.promise;

  if (!mongoose.connection.db) {
    throw new Error("DATABASE_NOT_READY");
  }
};

// ⭐ כדי שהייבוא שלך יעבוד:
// import dbConnect from "@/lib/db";
export default connectDB;
