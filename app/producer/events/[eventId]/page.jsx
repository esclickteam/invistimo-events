"use client";

import { useParams } from "next/navigation";
import OverviewTab from "@/app/dashboard/_components/OverviewTab";

export default function ProducerEventOverviewPage() {
  const { eventId } = useParams();
  return <OverviewTab eventId={eventId} />;
}
