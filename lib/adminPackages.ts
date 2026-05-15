export type AdminPackageKey = "plan1" | "plan2" | "plan3";

export type AdminPackage = {
  key: AdminPackageKey;
  label: string;
  records: number;
  sms: number;
  price: number;
  includeCalls: boolean;
  includeCreditGifts: boolean;
  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;
};

export const ADMIN_PACKAGES: AdminPackage[] = [
  {
    key: "plan1",
    label: "חבילה 1",
    records: 100,
    sms: 300,
    price: 402,
    includeCalls: false,
    includeCreditGifts: false,
    includeDigitalSeating: false,
    includeEventManagement: false,
    includeCustomDesign: false,
  },
  {
    key: "plan2",
    label: "חבילה 2",
    records: 200,
    sms: 600,
    price: 789,
    includeCalls: true,
    includeCreditGifts: false,
    includeDigitalSeating: false,
    includeEventManagement: false,
    includeCustomDesign: false,
  },
  {
    key: "plan3",
    label: "חבילה 3",
    records: 300,
    sms: 900,
    price: 1171,
    includeCalls: true,
    includeCreditGifts: true,
    includeDigitalSeating: true,
    includeEventManagement: true,
    includeCustomDesign: false,
  },
];

export function getAdminPackage(key?: string | null) {
  return (
    ADMIN_PACKAGES.find((item) => item.key === key) ||
    ADMIN_PACKAGES[0]
  );
}