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

/** Marcas de tiempo que prueban hasta dónde llegó realmente un acuerdo. */
export type JobProgress = { fundedAt?: bigint; deliveredAt?: bigint };

/**
 * Índice alcanzado en el camino feliz.
 *
 * Para los estados de desvío NO se puede deducir del estado a secas, porque el
 * programa admite salir del rail desde dos puntos distintos:
 *   · `cancel_refund` acepta `Created` o `Funded`
 *   · `open_dispute` acepta `Funded` o `Delivered`
 *
 * Un `Refunded` con `funded_at = 0` nunca llegó a Funded, y un `Resolved` con
 * `delivered_at = 0` nunca llegó a Delivered. Asumir el máximo pintaba pasos
 * que no ocurrieron, que es justo la sobreafirmación que este producto no
 * puede permitirse. Sin marcas de tiempo se devuelve el mínimo, nunca el máximo.
 */
export function reachedIndex(state: JobState, progress?: JobProgress): number {
  const direct = HAPPY_ORDER.indexOf(state);
  if (direct !== -1) return direct;

  const funded = (progress?.fundedAt ?? 0n) > 0n;
  const delivered = (progress?.deliveredAt ?? 0n) > 0n;

  if (state === JobState.Refunded) return funded ? 1 : 0;
  // Disputed | Resolved
  return delivered ? 2 : funded ? 1 : 0;
}
