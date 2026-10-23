import { NOINDEX } from "@/lib/seo/site";

export const metadata = {
  ...NOINDEX,
  title: { absolute: "חשבון | Invistimo" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
