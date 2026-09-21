import { RecordsScreen } from "@/src/records";

export default function ProducerStaffDashboard() {
  return (
    <RecordsScreen
      title="לקוחות משויכים"
      path="/api/producer-staff/clients"
      metaKeys={["email", "phone", "eventDate", "packageName"]}
    />
  );
}
