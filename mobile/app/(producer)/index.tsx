import { RecordsScreen } from "@/src/records";

export default function ProducerDashboard() {
  return (
    <RecordsScreen
      title="דשבורד מפיק"
      path="/api/producer/clients"
      metaKeys={["email", "phone", "eventDate", "packageName", "status"]}
      hrefForItem={(item) => `/(producer)/clients` as never}
    />
  );
}
