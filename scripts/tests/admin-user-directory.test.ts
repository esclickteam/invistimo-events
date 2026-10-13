import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  accountStatusLabel,
  associatedClientsForProducer,
  countAssociatedClients,
  employeeRoleLabel,
  eventFilterApplies,
  formatOpenBalance,
  matchesDirectoryRole,
} from "../../lib/admin/userDirectory";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function between(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, end);
  return source.slice(from, to);
}

test("directory role chips keep each user type in its own view", () => {
  assert.equal(matchesDirectoryRole("user", "clients"), true);
  assert.equal(matchesDirectoryRole("client", "clients"), true);
  assert.equal(matchesDirectoryRole("producer", "clients"), false);
  assert.equal(matchesDirectoryRole("staff", "clients"), false);
  assert.equal(matchesDirectoryRole("producer", "producer"), true);
  assert.equal(matchesDirectoryRole("staff", "producer"), false);
  assert.equal(matchesDirectoryRole("staff", "staff"), true);
  assert.equal(matchesDirectoryRole("producer", "staff"), false);
  assert.equal(matchesDirectoryRole("venue_owner", "all"), true);
  assert.equal(matchesDirectoryRole("admin", "clients"), false);
});

test("event date filtering stays on the clients view", () => {
  assert.equal(eventFilterApplies("clients"), true);
  assert.equal(eventFilterApplies("all"), false);
  assert.equal(eventFilterApplies("producer"), false);
  assert.equal(eventFilterApplies("staff"), false);
});

test("associated clients follow the existing producer assignment", () => {
  const users = [
    {
      _id: "c1",
      role: "client",
      assignedProducerIds: ["p1", "p2"],
    },
    {
      _id: "c2",
      role: "user",
      assignedProducerId: "p1",
    },
    {
      _id: "c3",
      role: "client",
      assignedProducerIds: ["p1"],
    },
    {
      _id: "hidden",
      role: "client",
      assignedProducerIds: ["p1"],
    },
    {
      _id: "staff-1",
      role: "staff",
      assignedProducerIds: ["p1"],
    },
    {
      _id: "p1",
      role: "producer",
    },
  ];

  assert.deepEqual(countAssociatedClients(users, ["hidden"]), { p1: 3, p2: 1 });
  assert.deepEqual(
    associatedClientsForProducer(users, "p1", ["hidden"]).map((user) => user._id),
    ["c1", "c2", "c3"]
  );
});

test("staff role and account status are display labels only", () => {
  assert.equal(employeeRoleLabel({ staffType: "seating_staff" }), "עובד הושבה");
  assert.equal(employeeRoleLabel({ staffType: "usher_staff" }), "דייל");
  assert.equal(employeeRoleLabel({ staffType: "producer_staff" }), "עובד של מפיק");
  assert.equal(employeeRoleLabel({ staffType: "general_staff" }), "עובד מערכת");
  assert.equal(employeeRoleLabel({ employeeScope: "venue" }), "עובד אולם");
  assert.equal(employeeRoleLabel({}), "עובד");
  assert.equal(accountStatusLabel(true), "פעיל");
  assert.equal(accountStatusLabel(false), "לא פעיל");
  assert.equal(accountStatusLabel(undefined), "פעיל");
  assert.equal(formatOpenBalance(3450), "3,450 ₪");
});

test("admin users page separates directory tables from the client event table", () => {
  const page = read("app/admin/users/page.tsx");
  const tables = read("app/admin/users/UserDirectoryTables.tsx");
  const clients = between(page, 'data-users-view="clients"', "ProducersDirectoryTable");

  assert.match(clients, /תאריך אירוע/);
  assert.match(clients, /חבילה/);
  assert.match(clients, /רשומות/);
  assert.doesNotMatch(clients, /יתרה לגבייה/);

  const producers = between(tables, "export function ProducersDirectoryTable", "export function StaffDirectoryTable");
  assert.match(producers, /שם מלא/);
  assert.match(producers, /אימייל/);
  assert.match(producers, /טלפון/);
  assert.match(producers, /לקוחות משויכים/);
  assert.match(producers, /יתרה לגבייה/);
  assert.match(producers, /סטטוס חשבון/);
  assert.match(producers, /\/admin\/users\/producers\/\$\{user\._id\}\/billing/);
  for (const forbidden of ["תאריך אירוע", "רשומות", "חבילה", "סכום חבילה", "שירותי אירוע", "מכסת הודעות"]) {
    assert.doesNotMatch(producers, new RegExp(forbidden));
  }

  const staff = between(tables, "export function StaffDirectoryTable", "export function AssociatedClientsModal");
  assert.match(staff, /סוג עובד/);
  assert.match(staff, /סטטוס חשבון/);
  for (const forbidden of ["תאריך אירוע", "רשומות", "חבילה", "יתרה לגבייה"]) {
    assert.doesNotMatch(staff, new RegExp(forbidden));
  }

  const allUsers = between(tables, "export function AllUsersDirectoryTable", "export function ProducersDirectoryTable");
  assert.match(allUsers, /סוג משתמש/);
  assert.doesNotMatch(allUsers, /תאריך אירוע/);
  assert.doesNotMatch(allUsers, /חבילה/);

  assert.match(page, /צפייה ועריכת פרטי המפיק/);
  assert.match(page, /הצגת לקוחות משויכים/);
  assert.match(page, /מעקב תשלומים/);
  assert.match(page, /ניהול חשבון/);
  assert.match(page, /variant === "staff"/);
  assert.match(page, /ניהול הרשאות/);
  assert.match(page, /סטטוס חשבון/);
  assert.match(page, /eventFilterApplies\(roleFilter\)/);
  assert.match(page, /useState\("all"\)/);
  assert.match(page, /openDirectoryProfile/);

  const profile = read("app/admin/users/DirectoryProfileModal.tsx");
  assert.match(profile, /producerPricePerRecord/);
  assert.match(profile, /staffType/);
  assert.match(profile, /isActive/);
  for (const forbidden of ["תאריך אירוע", "תקנון", "חבילה", "רשומות", "מכסות"]) {
    assert.doesNotMatch(profile, new RegExp(forbidden));
  }
  assert.match(page, /user\.role === "producer" \|\| user\.role === "staff"/);
});
