import dns from "node:dns";
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

function preferIpv4Dns() {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Older Node runtimes may not expose setDefaultResultOrder.
  }
}

function isMongoDnsResolutionError(error: unknown) {
  const err = error as { code?: string; message?: string; syscall?: string };
  const message = String(err?.message || "");
  return (
    err?.code === "ECONNREFUSED" ||
    err?.code === "ENOTFOUND" ||
    err?.code === "querySrvECONNREFUSED" ||
    /querySrv/i.test(message) ||
    /ECONNREFUSED/i.test(message)
  );
}

/**
 * Same approved MONGO_URI credentials — only changes DNS resolvers when the
 * local Node resolver (often broken IPv6) cannot answer mongodb+srv SRV/TXT.
 */
function ensurePublicDnsForSrv(uri: string) {
  if (!/mongodb\+srv:\/\//i.test(uri)) return;

  preferIpv4Dns();

  const previous = dns.getServers();
  if (!previous.includes("8.8.8.8") && !previous.includes("1.1.1.1")) {
    // Local Windows resolvers sometimes refuse Node SRV lookups over IPv6.
    // Keep the same approved MONGO_URI — only add public resolvers.
    dns.setServers(["8.8.8.8", "1.1.1.1", ...previous]);
  }
}

async function connectMongoWithDnsFallback(uri: string) {
  ensurePublicDnsForSrv(uri);

  try {
    return await mongoose.connect(uri);
  } catch (error) {
    if (!isMongoDnsResolutionError(error)) {
      throw error;
    }

    const previous = dns.getServers();
    dns.setServers(["8.8.8.8", "1.1.1.1", ...previous]);
    preferIpv4Dns();

    console.warn("⚠️ MongoDB DNS resolve failed; retrying with public resolvers", {
      code: (error as any)?.code || null,
    });

    return mongoose.connect(uri);
  }
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
    cached.promise = connectMongoWithDnsFallback(MONGO_URI)
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
