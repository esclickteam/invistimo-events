import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

let memoryServer = null;
let skipped = false;
let skipReason = "";

const { Schema, model, Types } = mongoose;

const TestUser = model(
  "VenueDbIsolationUser",
  new Schema({
    name: String,
    email: { type: String, unique: true },
    role: String,
    venueUser: Boolean,
    employeeScope: String,
    isActive: { type: Boolean, default: true },
    authVersion: { type: Number, default: 0 },
  })
);

const TestVenueHall = model(
  "VenueDbIsolationHall",
  new Schema({
    ownerId: { type: Schema.Types.ObjectId, required: true },
    id: { type: String, required: true, unique: true },
    name: String,
    subtitle: String,
  })
);

const TestVenueMembership = model(
  "VenueDbIsolationMembership",
  new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    venueId: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    role: String,
    status: { type: String, default: "active" },
  })
);

const TestVenueLead = model(
  "VenueDbIsolationLead",
  new Schema({
    ownerId: { type: Schema.Types.ObjectId, required: true },
    hallId: { type: String, required: true, index: true },
    name: String,
    phone: String,
  })
);

async function tryStartMemoryServer() {
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    return memoryServer.getUri();
  } catch (err) {
    skipped = true;
    skipReason =
      err?.message ||
      String(err) ||
      "mongodb-memory-server failed to download/start";
    return null;
  }
}

test.before(async () => {
  const uri = await tryStartMemoryServer();
  if (!uri) return;
  await mongoose.connect(uri);
});

test.after(async () => {
  if (mongoose.connection.readyState >= 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
  }
});

test("venue data isolation across halls in Mongo", async (t) => {
  if (skipped) {
    t.skip(`Skipping Mongo memory-server test: ${skipReason}`);
    return;
  }

  const ownerA = await TestUser.create({
    name: "Owner A",
    email: `owner-a-${Date.now()}@test.local`,
    role: "venue_owner",
    isActive: true,
    authVersion: 0,
  });

  const ownerB = await TestUser.create({
    name: "Owner B",
    email: `owner-b-${Date.now()}@test.local`,
    role: "venue_owner",
    isActive: true,
    authVersion: 0,
  });

  const employee = await TestUser.create({
    name: "Shared Employee",
    email: `employee-${Date.now()}@test.local`,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    isActive: true,
    authVersion: 0,
  });

  const hallA = await TestVenueHall.create({
    ownerId: ownerA._id,
    id: `hall-a-${Date.now()}`,
    name: "Hall A",
    subtitle: "",
  });

  const hallB = await TestVenueHall.create({
    ownerId: ownerB._id,
    id: `hall-b-${Date.now()}`,
    name: "Hall B",
    subtitle: "",
  });

  await TestVenueMembership.create({
    userId: employee._id,
    venueId: hallA.id,
    ownerId: ownerA._id,
    role: "SALES",
    status: "active",
  });

  await TestVenueMembership.create({
    userId: employee._id,
    venueId: hallB.id,
    ownerId: ownerB._id,
    role: "VIEWER",
    status: "active",
  });

  await TestVenueLead.create({
    ownerId: ownerA._id,
    hallId: hallA.id,
    name: "Lead for Hall A",
    phone: "0501111111",
  });

  await TestVenueLead.create({
    ownerId: ownerB._id,
    hallId: hallB.id,
    name: "Lead for Hall B",
    phone: "0502222222",
  });

  const membershipA = await TestVenueMembership.findOne({
    userId: employee._id,
    venueId: hallA.id,
    status: "active",
  }).lean();

  const membershipB = await TestVenueMembership.findOne({
    userId: employee._id,
    venueId: hallB.id,
    status: "active",
  }).lean();

  assert.equal(membershipA.role, "SALES");
  assert.equal(membershipB.role, "VIEWER");

  const leadsForA = await TestVenueLead.find({ hallId: hallA.id }).lean();
  const leadsForB = await TestVenueLead.find({ hallId: hallB.id }).lean();

  assert.equal(leadsForA.length, 1);
  assert.equal(leadsForB.length, 1);
  assert.equal(leadsForA[0].name, "Lead for Hall A");
  assert.equal(leadsForB[0].name, "Lead for Hall B");

  const crossQuery = await TestVenueLead.find({
    hallId: hallA.id,
    name: "Lead for Hall B",
  }).lean();
  assert.equal(crossQuery.length, 0);

  const wrongOwnerScoped = await TestVenueLead.find({
    ownerId: ownerA._id,
    hallId: hallB.id,
  }).lean();
  assert.equal(wrongOwnerScoped.length, 0);
});
