import { NOINDEX } from "@/lib/seo/site";

export const metadata = {
  ...NOINDEX,
  title: { absolute: "הדגמה | Invistimo" },
};

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
