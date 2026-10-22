import { NOINDEX, pageMetadata } from "@/lib/seo/site";

export const metadata = {
  ...pageMetadata({
    title: "חבילות | Invistimo",
    description: "המחיר העדכני נמצא בעמוד החבילות.",
    path: "/pricing",
    index: false,
  }),
  ...NOINDEX,
  alternates: { canonical: "https://www.invistimo.com/pricing" },
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
