import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ImportRow = {
  key: string;
  name: string;
  phone: string;
  email: string;
  selected: boolean;
  duplicate: boolean;
  duplicateReason: string;
};

type ImportDraftValue = {
  rows: ImportRow[];
  setRows: (rows: ImportRow[]) => void;
};

const ImportDraftContext = createContext<ImportDraftValue | null>(null);

export function ImportDraftProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const value = useMemo(() => ({ rows, setRows }), [rows]);
  return (
    <ImportDraftContext.Provider value={value}>
      {children}
    </ImportDraftContext.Provider>
  );
}

export function useImportDraft() {
  const value = useContext(ImportDraftContext);
  if (!value) throw new Error("ImportDraftProvider missing");
  return value;
}
