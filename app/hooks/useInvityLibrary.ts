"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export function useInvityLibrary(type: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["invity-library", type],
    queryFn: async () => {
      const res = await axios.get(`/api/invity/library/${type}`);
      return res.data;
    },
  });

  // פונקציה להוספה למאגר
  const addToLibrary = async (item: any) => {
    try {
      const res = await axios.post(`/api/invity/library/${type}`, item);
      const newItem = res.data;

      // מעדכנים את ה-query cache כדי שהטאב יתעדכן אוטומטית
      queryClient.setQueryData(["invity-library", type], (oldData: any) => [
        ...(oldData || []),
        newItem,
      ]);
    } catch (err) {
      console.error("Error adding to library:", err);
    }
  };

  return { ...query, addToLibrary };
}
