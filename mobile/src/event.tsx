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
  api,
  fetchEvent,
  fetchGuests,
  fetchInvitation,
  type Guest,
  type GuestUsage,
  type Invitation,
} from "@/src/api";
import { customerError } from "@/src/errors";
import { useAuth } from "@/src/auth";
import { resolveAppExperience } from "@/src/roles";

type EventContextValue = {
  loading: boolean;
  invitation: Invitation | null;
  event: Record<string, unknown> | null;
  guests: Guest[];
  usage: GuestUsage | null;
  eventLive: boolean;
  checkInEnabled: boolean;
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
  const [eventLive, setEventLive] = useState(false);
  const [checkInEnabled, setCheckInEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const experience = resolveAppExperience(user);
    const isCustomer =
      experience === "customer" ||
      experience === "customer_production" ||
      experience === "customer_challenges";
    if (!user || !isCustomer) {
      setInvitation(null);
      setEvent(null);
      setGuests([]);
      setUsage(null);
      setEventLive(false);
      setCheckInEnabled(false);
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
          setError(customerError(guestResult.status, guestResult.data, "לא הצלחנו לטעון מוזמנים"));
        }
      } else {
        setGuests([]);
      }
      const eventId = String(nextInvitation?.eventId || nextEvent?._id || "");
      if (eventId) {
        const settings = await api<{ live?: boolean; checkInEnabled?: boolean }>(
          `/api/events/${eventId}/check-in-settings`
        );
        setEventLive(Boolean(settings.data.live));
        setCheckInEnabled(Boolean(settings.data.checkInEnabled));
      } else {
        setEventLive(false);
        setCheckInEnabled(false);
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
    () => ({
      loading,
      invitation,
      event,
      guests,
      usage,
      eventLive,
      checkInEnabled,
      error,
      refresh,
    }),
    [loading, invitation, event, guests, usage, eventLive, checkInEnabled, error, refresh]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEventData() {
  const value = useContext(EventContext);
  if (!value) throw new Error("EventProvider missing");
  return value;
}
