import { motion, useReducedMotion } from "framer-motion";
import { JobState } from "../../generated/repulink/types/jobState";
import { HAPPY_PATH, reachedIndex, DETOURS } from "../../lib/job-state";

/**
 * El ciclo de vida del escrow, dibujado.
 *
 * Es el elemento que da identidad al producto: RepuLink *es* esta máquina de
 * estados, y hasta ahora solo se veía como una píldora de texto en una esquina.
 * Se usa en tres sitios con la misma gramática visual — hero del landing,
 * cabecera del job y versión mínima en las tarjetas del listado — para que el
 * mismo concepto se lea igual en toda la app.
 *
 * El camino feliz es el rail. Disputa y reembolso son desvíos, y se dibujan
 * como tales: no son pasos que uno "alcanza", son salidas.
 */

const DOT_TONE: Record<"done" | "current" | "todo", string> = {
  done: "bg-state-done border-state-done",
  current: "bg-state-active border-state-active",
  todo: "border-border-strong bg-background",
};

export function LifecycleRail({
  state,
  className = "",
  animate = true,
}: {
  state: JobState;
  className?: string;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const reached = reachedIndex(state);
  const detour = DETOURS[state];
  const isTerminal =
    state === JobState.Released ||
    state === JobState.Resolved ||
    state === JobState.Refunded;

  // Cuánto del rail está recorrido, de 0 a 1.
  const progress = reached / (HAPPY_PATH.length - 1);
  const shouldAnimate = animate && !reduced;

  return (
    <div className={className}>
      <div className="relative">
        {/* Vía */}
        <div className="absolute left-0 right-0 top-[7px] h-px bg-border-strong" />
        {/* Recorrido */}
        <motion.div
          className="absolute left-0 top-[7px] h-px origin-left bg-gradient-to-r from-state-funded to-state-done"
          initial={shouldAnimate ? { scaleX: 0 } : false}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={{ right: 0 }}
        />

        <ol className="relative flex justify-between">
          {HAPPY_PATH.map((step, i) => {
            const tone: "done" | "current" | "todo" =
              i < reached ? "done" : i === reached ? "current" : "todo";
            // Un terminal deja el último punto en verde, no en "actual".
            const resolvedTone = isTerminal && i === reached ? "done" : tone;
            return (
              <li key={step.key} className="flex flex-col items-center gap-2">
                <motion.span
                  className={`h-[15px] w-[15px] rounded-full border-2 ${DOT_TONE[resolvedTone]}`}
                  initial={shouldAnimate ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.34, 1.4, 0.64, 1],
                    delay: 0.15 + i * 0.09,
                  }}
                />
                <span
                  className={`text-[10px] font-semibold uppercase tracking-widest ${
                    resolvedTone === "todo"
                      ? "text-muted/50"
                      : "text-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {detour && (
        <motion.p
          initial={shouldAnimate ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className={`mt-4 text-center text-xs font-semibold uppercase tracking-widest ${detour.tone}`}
        >
          ↳ {detour.label}
        </motion.p>
      )}
    </div>
  );
}

/** Versión mínima para las tarjetas del listado: solo los puntos. */
export function LifecycleDots({ state }: { state: JobState }) {
  const reached = reachedIndex(state);
  const alert = state === JobState.Disputed;
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {HAPPY_PATH.map((step, i) => (
        <span
          key={step.key}
          className={`h-1.5 rounded-full transition-colors ${
            i <= reached
              ? alert
                ? "w-4 bg-state-alert"
                : "w-4 bg-state-done"
              : "w-1.5 bg-border-strong"
          }`}
        />
      ))}
    </div>
  );
}
