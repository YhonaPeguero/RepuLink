import { useMemo, useState, type ReactNode } from "react";
import { CompanionCtx, type CompanionJob } from "./companion-ctx";

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<CompanionJob>(null);
  const value = useMemo(() => ({ job, setJob }), [job]);
  return (
    <CompanionCtx.Provider value={value}>{children}</CompanionCtx.Provider>
  );
}
