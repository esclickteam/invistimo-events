"use client";

import { useParams } from "next/navigation";
import OverviewTab from "@/app/events/production/_components/OverviewTab";

export default function ProducerEventOverviewPage() {
  const { eventId } = useParams();
  return <OverviewTab eventId={eventId} />;
}
