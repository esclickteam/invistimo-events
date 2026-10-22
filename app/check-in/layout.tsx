import type { ReactNode } from "react";
import { NOINDEX } from "@/lib/seo/site";

export const metadata = NOINDEX;

export default function CheckInLayout({ children }: { children: ReactNode }) {
  return children;
}
