import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, ShieldCheck, Unlock } from "lucide-react";

/**
 * El movimiento real del dinero, animado.
 *
 * Sustituye a los párrafos que antes explicaban el producto: en vez de leer
 * "el cliente bloquea los fondos y el freelancer cobra al entregar", se ve.
 * La secuencia sigue exactamente el camino del programa — fund, deliver,
 * release — y no inventa ningún paso que la cadena no haga.
 *
 * Cuatro fases en bucle, con una pausa al final para que se lea el resultado.
 */

const PHASES = [
  { key: "fund", label: "Payer funds the vault", ms: 2100 },
  { key: "hold", label: "Locked. Neither side can touch it", ms: 2000 },
  { key: "deliver", label: "Work is delivered", ms: 1900 },
  { key: "release", label: "Released, and attested", ms: 2600 },
] as const;

type Phase = (typeof PHASES)[number]["key"];

export function EscrowFlow() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const phase: Phase = PHASES[i].key;

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(
      () => setI((n) => (n + 1) % PHASES.length),
      PHASES[i].ms
    );
    return () => clearTimeout(t);
  }, [i, reduced]);

  // Con movimiento reducido se muestra el estado final, que es el informativo.
  const shown: Phase = reduced ? "release" : phase;
  const locked = shown === "hold" || shown === "deliver";
  const released = shown === "release";
  const funded = shown !== "fund";

  return (
    <div className="relative select-none">
      <div className="relative flex min-w-0 items-center justify-between gap-2 sm:gap-6">
        <Party label="Payer" active={shown === "fund"} />

        {/* Tramo cliente → vault */}
        <Wire active={funded} reverse={false} />

        {/* El vault */}
        <div className="relative shrink-0">
          <motion.div
            animate={
              reduced
                ? {}
                : {
                    boxShadow: locked
                      ? "0 0 0 1px rgba(59,130,246,0.35), 0 0 42px -6px rgba(59,130,246,0.5)"
                      : released
                        ? "0 0 0 1px rgba(52,211,153,0.4), 0 0 48px -4px rgba(52,211,153,0.55)"
                        : "0 0 0 1px rgba(255,255,255,0.08), 0 0 0 rgba(0,0,0,0)",
                  }
            }
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border-low bg-background sm:h-36 sm:w-36 sm:rounded-[1.4rem]"
          >
            <motion.div
              key={released ? "open" : locked ? "shut" : "idle"}
              initial={reduced ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.34, 1.4, 0.64, 1] }}
            >
              {released ? (
                <Unlock className="h-7 w-7 text-state-done sm:h-9 sm:w-9" />
              ) : locked ? (
                <Lock className="h-7 w-7 text-state-funded sm:h-9 sm:w-9" />
              ) : (
                <Lock className="h-7 w-7 text-muted/40 sm:h-9 sm:w-9" />
              )}
            </motion.div>

            {/* El importe, dentro mientras está retenido */}
            <motion.span
              animate={{
                opacity: locked ? 1 : 0,
                y: locked ? 0 : 6,
              }}
              transition={{ duration: 0.4 }}
              className="absolute -bottom-8 whitespace-nowrap font-mono text-sm font-medium text-state-funded tabular"
            >
              100.00 <span className="text-[10px] text-muted">in escrow</span>
            </motion.span>
          </motion.div>

          {/* Sello de atestación */}
          <motion.div
            initial={false}
            animate={
              released
                ? { scale: 1, opacity: 1, rotate: 0 }
                : { scale: 0.4, opacity: 0, rotate: -25 }
            }
            transition={{
              duration: 0.5,
              ease: [0.34, 1.4, 0.64, 1],
              delay: released ? 0.5 : 0,
            }}
            className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-state-done/40 bg-background"
          >
            <ShieldCheck className="h-4 w-4 text-state-done" />
          </motion.div>
        </div>

        {/* Tramo vault → freelancer */}
        <Wire active={released} reverse />

        <Party label="Worker" active={shown === "deliver" || released} />
      </div>

      {/* Qué está pasando, en una línea */}
      <div className="mt-12 min-h-[2.5rem] text-center">
        <motion.p
          key={shown}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted sm:text-xs sm:tracking-[0.16em]"
        >
          {PHASES.find((p) => p.key === shown)?.label}
        </motion.p>
      </div>

      {/* Reparto real al liberar: 1% al treasury, el resto a quien trabajó */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-low bg-border-low">
        {[
          { k: "To the worker", v: "99.00", tone: "text-state-done" },
          { k: "Protocol fee", v: "1.00", tone: "text-muted" },
        ].map(({ k, v, tone }) => (
          <div key={k} className="bg-background/60 px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
              {k}
            </p>
            <motion.p
              animate={{ opacity: released ? 1 : 0.28 }}
              transition={{ duration: 0.5 }}
              className={`mt-1 font-mono text-sm font-medium tabular ${tone}`}
            >
              {v}
            </motion.p>
          </div>
        ))}
      </div>

      {/* Progreso de la secuencia */}
      {!reduced && (
        <div className="mt-5 flex justify-center gap-1.5">
          {PHASES.map((p, n) => (
            <span
              key={p.key}
              className={`h-1 rounded-full transition-all duration-500 ${
                n === i ? "w-6 bg-primary" : "w-1.5 bg-border-strong"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Party({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col items-center gap-2.5">
      <motion.div
        animate={{
          borderColor: active
            ? "rgba(153,69,255,0.5)"
            : "rgba(255,255,255,0.06)",
          scale: active ? 1.05 : 1,
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-11 w-11 items-center justify-center rounded-xl border bg-elev-1 sm:h-16 sm:w-16"
      >
        <span className="font-heading text-base font-black text-white/80">
          {label[0]}
        </span>
      </motion.div>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted sm:text-[10px] sm:tracking-widest">
        {label}
      </span>
    </div>
  );
}

/** Cable entre nodos. Cuando está activo, una partícula lo recorre. */
function Wire({ active, reverse }: { active: boolean; reverse: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative h-px min-w-4 flex-1 bg-border-strong sm:min-w-8">
      <motion.div
        className="absolute inset-y-0 left-0 right-0 origin-left bg-gradient-to-r from-state-funded to-state-done"
        animate={{ scaleX: active ? 1 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: reverse ? "right" : "left" }}
      />
      {active && !reduced && (
        <motion.span
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.6)]"
          initial={{ left: reverse ? "100%" : "0%", opacity: 0 }}
          animate={{ left: reverse ? "0%" : "100%", opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.1,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />
      )}
    </div>
  );
}
