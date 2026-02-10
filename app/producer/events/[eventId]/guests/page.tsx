"use client";

import OverviewTab from "@/app/events/production/_components/OverviewTab";

type ProducerEventPageProps = {
  params: {
    eventId: string;
  };
};

export default function ProducerEventPage({ params }: ProducerEventPageProps) {
  const eventId = params.eventId;
  return <OverviewTab eventId={eventId} />;
}
