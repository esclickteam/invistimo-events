import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchEvent,
  fetchGuests,
  fetchInvitation,
  type Guest,
  type GuestUsage,
  type Invitation,
} from "@/src/api";
import { useAuth } from "@/src/auth";

type EventContextValue = {
  loading: boolean;
  invitation: Invitation | null;
  event: Record<string, unknown> | null;
  guests: Guest[];
  usage: GuestUsage | null;
  error: string;
  refresh: () => Promise<void>;
};

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [usage, setUsage] = useState<GuestUsage | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) {
      setInvitation(null);
      setEvent(null);
      setGuests([]);
      setUsage(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [nextInvitation, nextEvent] = await Promise.all([
        fetchInvitation(),
        fetchEvent(),
      ]);
      setInvitation(nextInvitation);
      setEvent(nextEvent);
      if (nextInvitation?._id) {
        const guestResult = await fetchGuests(nextInvitation._id);
        setGuests(guestResult.data.guests || []);
        setUsage(guestResult.data.usage || null);
        if (!guestResult.ok) {
          setError(guestResult.data.message || guestResult.data.error || "");
        }
      } else {
        setGuests([]);
      }
    } catch {
      setError("לא הצלחנו לטעון את האירוע");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ loading, invitation, event, guests, usage, error, refresh }),
    [loading, invitation, event, guests, usage, error, refresh]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEventData() {
  const value = useContext(EventContext);
  if (!value) throw new Error("EventProvider missing");
  return value;
}
