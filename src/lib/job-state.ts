import { JobState } from "../generated/repulink/types/jobState";

/** Etiqueta y estilo de cada estado del Job. Compartido por JobPage y las
 * tarjetas del listado para que un estado se vea igual en toda la app. */
export const STATE_META: Record<
  JobState,
  { label: string; className: string }
> = {
  [JobState.Created]: {
    label: "Created (unfunded)",
    className: "text-muted border-border-strong",
  },
  [JobState.Funded]: {
    label: "Funded",
    className: "text-secondary border-secondary/40",
  },
  [JobState.Delivered]: {
    label: "Delivered",
    className: "text-accent-gold border-accent-gold/40",
  },
  [JobState.Released]: {
    label: "Released",
    className: "text-green-400 border-green-400/40",
  },
  [JobState.Refunded]: {
    label: "Refunded",
    className: "text-muted border-border-strong",
  },
  [JobState.Disputed]: {
    label: "Disputed",
    className: "text-red-400 border-red-400/40",
  },
  [JobState.Resolved]: {
    label: "Resolved",
    className: "text-green-400 border-green-400/40",
  },
};

/** Estados en los que el dinero ya salió del vault. */
export const TERMINAL_STATES: ReadonlySet<JobState> = new Set([
  JobState.Released,
  JobState.Refunded,
  JobState.Resolved,
]);
