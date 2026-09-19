import { notFound } from "next/navigation";

import dbConnect from "@/lib/db";
import { isValidCheckInTokenShape } from "@/lib/checkIn/token";
import { loadGuestPassByToken } from "@/lib/checkIn/loadGuestPass";
import CheckInPassClient from "../CheckInPassClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CheckInPassPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(String(raw || "")).trim();
  if (!isValidCheckInTokenShape(token)) notFound();

  await dbConnect();
  const pass = await loadGuestPassByToken(token);
  if (!pass) notFound();

  return <CheckInPassClient initialPass={pass} />;
}
