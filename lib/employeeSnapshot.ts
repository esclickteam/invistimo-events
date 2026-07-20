export type EmployeeSnapshot = {
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeIdNumber: string;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildEmployeeSnapshot(user: any): EmployeeSnapshot {
  const firstName = cleanStr(user?.firstName);
  const lastName = cleanStr(user?.lastName);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    employeeName:
      cleanStr(user?.name) ||
      cleanStr(user?.fullName) ||
      combinedName ||
      "",
    employeeEmail: cleanStr(user?.email),
    employeePhone: cleanStr(user?.phone),
    employeeIdNumber: cleanStr(user?.idNumber || user?.employeeIdNumber),
  };
}

export function isCheckboxChecked(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
}
