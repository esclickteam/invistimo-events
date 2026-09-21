import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type VenueState = {
  hallId: string;
  name: string;
  role: string;
  permissions: string[];
  setHall: (hall: { hallId: string; name: string; role: string; permissions: string[] }) => void;
};

const VenueContext = createContext<VenueState | null>(null);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [hall, setHallState] = useState({
    hallId: "",
    name: "",
    role: "",
    permissions: [] as string[],
  });
  const value = useMemo(
    () => ({
      ...hall,
      setHall: (next: { hallId: string; name: string; role: string; permissions: string[] }) => {
        setHallState(next);
      },
    }),
    [hall]
  );
  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}

export function useVenueHall() {
  const value = useContext(VenueContext);
  if (!value) {
    return {
      hallId: "",
      name: "",
      role: "",
      permissions: [] as string[],
      setHall: () => undefined,
    };
  }
  return value;
}
