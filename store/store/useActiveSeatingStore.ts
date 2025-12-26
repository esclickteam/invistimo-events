import { useSeatingStore } from "@/store/seatingStore";
import { useDemoSeatingStore } from "@/store/store/demoSeatingStore";

/**
 * מחזיר את ה-store הפעיל:
 * דמו → demo store
 * רגיל → real store
 */
export const useActiveSeatingStore = () => {
  const isDemo = useDemoSeatingStore.getState().demoMode === true;
  return isDemo ? useDemoSeatingStore : useSeatingStore;
};
