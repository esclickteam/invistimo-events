import { RecordsScreen } from "@/src/records";

export default function ProducerStaff() {
  return (
    <RecordsScreen
      title="עובדים"
      path="/api/producer/staff/list"
      metaKeys={["email", "phone", "staffType", "role"]}
    />
  );
}
