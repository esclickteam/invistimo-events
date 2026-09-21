import { RecordsScreen } from "@/src/records";

export default function ProducerClients() {
  return (
    <RecordsScreen
      title="לקוחות"
      path="/api/producer/clients"
      metaKeys={["email", "phone", "eventDate", "packageName"]}
    />
  );
}
