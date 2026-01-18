import { LiveSeatingProvider } from "./LiveSeatingProvider";
import GuestListLive from "./GuestListLive";
import SeatingMapLive from "./SeatingMapLive";

const INITIAL = {
  tables: [
    { id: "t1", name: "שולחן 1", capacity: 10 },
    { id: "t2", name: "שולחן 2", capacity: 8 },
  ],
  guests: [
    {
      id: "g1",
      name: "משפחת כהן",
      phone: "050",
      tableId: "t1",
      approved: 5,
      arrived: 0,
    },
  ],
};

export default function Page() {
  return (
    <LiveSeatingProvider initial={INITIAL}>
      <div style={{ display: "flex", height: "100vh" }}>
        <SeatingMapLive />
        <GuestListLive />
      </div>
    </LiveSeatingProvider>
  );
}
