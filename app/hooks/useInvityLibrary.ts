"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useInvityLibrary(type: string) {
  return useQuery({
    queryKey: ["invity-library", type],
    queryFn: async () => {
      const res = await axios.get(`/api/invity/library/${type}`);
      return res.data;
    },
  });
}
