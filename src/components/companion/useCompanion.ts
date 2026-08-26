import { useContext } from "react";
import { CompanionCtx } from "./companion-ctx";

/** Acceso al contexto del companion. */
export function useCompanion() {
  return useContext(CompanionCtx);
}
