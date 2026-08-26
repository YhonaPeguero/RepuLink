import { createContext } from "react";
import { JobState } from "../../generated/repulink/types/jobState";

/**
 * Lo que la página actual le cuenta al companion.
 *
 * Solo `JobPage` publica aquí, y solo datos que ya cargó para pintarse. El
 * companion no hace ni una consulta propia: si tuviera su propio fetch podría
 * mostrar un estado distinto al de la página, y en un producto con dinero
 * dentro eso es peor que no decir nada.
 *
 * El contexto vive en su propio archivo, sin componentes, porque mezclarlo con
 * el provider rompe Fast Refresh.
 */
export type CompanionJob = {
  /** A qué acuerdo pertenece este estado. La guía lo compara con la ruta antes
   * de usarlo, para no pintar el estado del acuerdo anterior al navegar. */
  address: string;
  state: JobState;
  freelancer: string;
} | null;

export type CompanionCtxValue = {
  job: CompanionJob;
  setJob: (j: CompanionJob) => void;
};

export const CompanionCtx = createContext<CompanionCtxValue>({
  job: null,
  setJob: () => {},
});
