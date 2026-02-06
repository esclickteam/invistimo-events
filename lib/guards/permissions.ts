import { IUser } from "@/models/User";
import mongoose from "mongoose";

export function isAdmin(user?: IUser | null) {
  return user?.role === "admin";
}

export function isProducer(user?: IUser | null) {
  return user?.role === "producer";
}

export function canCreateUser({
  actingUser,
  roleToCreate,
}: {
  actingUser: IUser;
  roleToCreate: IUser["role"];
}) {
  if (actingUser.role === "admin") return true;

  if (
    actingUser.role === "producer" &&
    roleToCreate === "client"
  ) {
    return true;
  }

  return false;
}

export function canEditUser({
  actingUser,
  targetUser,
}: {
  actingUser: IUser;
  targetUser: IUser;
}) {
  if (actingUser.role === "admin") return true;

  if (
    actingUser.role === "producer" &&
    targetUser.createdByProducer &&
    new mongoose.Types.ObjectId(
      targetUser.createdByProducer
    ).equals(actingUser._id)
  ) {
    return true;
  }

  return false;
}
