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

/** Un paso del camino feliz, tal y como lo dibuja el rail. */
export type RailStep = {
  key: string;
  label: string;
  state: JobState;
};

/** Camino feliz. El orden es el del programa: create → fund → deliver → release. */
export const HAPPY_PATH: RailStep[] = [
  { key: "created", label: "Created", state: JobState.Created },
  { key: "funded", label: "Funded", state: JobState.Funded },
  { key: "delivered", label: "Delivered", state: JobState.Delivered },
  { key: "released", label: "Released", state: JobState.Released },
];

const HAPPY_ORDER: JobState[] = HAPPY_PATH.map((s) => s.state);

/** Estados que no están en el rail: son salidas, no pasos. */
export const DETOURS: Partial<
  Record<JobState, { label: string; tone: string }>
> = {
  [JobState.Disputed]: { label: "Disputed", tone: "text-state-alert" },
  [JobState.Resolved]: {
    label: "Resolved by arbiter",
    tone: "text-state-done",
  },
  [JobState.Refunded]: {
    label: "Refunded to client",
    tone: "text-state-idle",
  },
};

/**
 * Índice alcanzado en el camino feliz. Los estados de desvío se mapean al punto
 * donde el job se salió del rail: `Refunded` solo puede venir de `Created` o
 * `Funded`, y `Disputed`/`Resolved` como muy tarde de `Delivered`.
 */
export function reachedIndex(state: JobState): number {
  const direct = HAPPY_ORDER.indexOf(state);
  if (direct !== -1) return direct;
  if (state === JobState.Refunded) return 1;
  return 2;
}
