import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWalletConnection } from "@solana/react-hooks";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronUp, Compass, X } from "lucide-react";
import {
  messageFor,
  TOPICS,
  TOUR,
  type CompanionAction,
  type TopicKey,
} from "../../lib/companion-context";
import { useCompanion } from "./useCompanion";
import { CompanionAvatar } from "./CompanionAvatar";
import { CompanionWelcome } from "./CompanionWelcome";

/**
 * Guía contextual de RepuLink.
 *
 * No es un chat. Es un riel anclado abajo que dice, en una frase, qué es esta
 * pantalla y qué se puede hacer ahora. Habla el mismo idioma visual que el
 * `LifecycleRail`: el filo izquierdo lleva el color del estado, así que un
 * acuerdo `Funded` tiñe la guía de azul y uno liquidado de verde.
 *
 * Límites, deliberados: no firma, no libera fondos, no arbitra y no muta estado.
 * Sus acciones son navegar o abrir una explicación, nada más.
 */

const TONE: Record<string, { bar: string; glow: string }> = {
  brand: { bar: "bg-primary", glow: "rgba(153,69,255,0.35)" },
  funded: { bar: "bg-state-funded", glow: "rgba(59,130,246,0.35)" },
  active: { bar: "bg-state-active", glow: "rgba(251,191,36,0.35)" },
  done: { bar: "bg-state-done", glow: "rgba(52,211,153,0.35)" },
  idle: { bar: "bg-state-idle", glow: "rgba(161,161,170,0.25)" },
  alert: { bar: "bg-state-alert", glow: "rgba(248,113,113,0.35)" },
};

const DISMISSED = "repulink:guide-dismissed";
const SEEN_WELCOME = "repulink:guide-welcomed";

function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(SEEN_WELCOME) === "1";
  } catch {
    // Modo privado o cookies bloqueadas: mejor no insistir con la bienvenida.
    return true;
  }
}

function markWelcomed(): void {
  try {
    localStorage.setItem(SEEN_WELCOME, "1");
  } catch {
    /* sin persistencia; no pasa nada */
  }
}

export function Companion() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { job } = useCompanion();
  const { status } = useWalletConnection();

  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED) === "1";
    } catch {
      return false;
    }
  });
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  // La bienvenida solo tiene sentido en la portada y en la primera visita.
  const [welcome, setWelcome] = useState(
    () => !hasSeenWelcome() && window.location.pathname === "/"
  );

  const msg = messageFor({
    pathname: location.pathname,
    jobState: job?.state,
    jobFreelancer: job?.freelancer,
    isConnected: status === "connected",
  });
  const tone = TONE[msg.tone] ?? TONE.brand;

  // Al cambiar de pantalla se cierra la explicación abierta: hablaba de la
  // pantalla anterior.
  useEffect(() => {
    setTopic(null);
  }, [location.pathname]);

  // Durante el recorrido, avanzar significa navegar.
  useEffect(() => {
    if (tourStep === null) return;
    const stop = TOUR[tourStep];
    if (stop && location.pathname !== stop.to) navigate(stop.to);
    // Navegar es el efecto; no hace falta reaccionar a cambios de pathname.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);

  if (hidden) {
    return (
      <button
        onClick={() => {
          setHidden(false);
          try {
            sessionStorage.removeItem(DISMISSED);
          } catch {
            /* modo privado: no persiste, no pasa nada */
          }
        }}
        aria-label="Show the guide"
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border-low bg-elev-2 text-muted shadow-lg backdrop-blur-xl transition-all duration-[--dur-micro] hover:-translate-y-0.5 hover:text-white"
      >
        <Compass className="h-5 w-5" />
      </button>
    );
  }

  const onAction = (a: CompanionAction) => {
    if (a.kind === "navigate") navigate(a.to);
    else if (a.kind === "explain")
      setTopic((t) => (t === a.topic ? null : a.topic));
    else window.open(a.href, "_blank", "noreferrer");
  };

  const inTour = tourStep !== null;
  const stop = inTour ? TOUR[tourStep] : null;

  return (
    <>
      <AnimatePresence>
        {welcome && (
          <CompanionWelcome
            onTour={() => {
              markWelcomed();
              setWelcome(false);
              setTourStep(0);
            }}
            onDismiss={() => {
              markWelcomed();
              setWelcome(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6">
        <motion.aside
          layout
          initial={reduced ? false : { y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          style={{ boxShadow: `0 18px 50px -18px ${tone.glow}` }}
          className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border-low bg-background/85 backdrop-blur-2xl"
          aria-live="polite"
        >
          {/* Filo de estado: el mismo color que usa el rail del acuerdo */}
          <motion.div layout className={`h-[3px] w-full ${tone.bar}`} />

          <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <motion.div layout className="mt-0.5">
              <CompanionAvatar size={34} tone={msg.tone} speaking={inTour} />
            </motion.div>

            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={inTour ? `tour-${tourStep}` : msg.headline}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                  className="text-sm font-semibold leading-snug text-white"
                >
                  {inTour ? stop?.say : msg.headline}
                </motion.p>
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {open && !inTour && msg.body && (
                  <motion.p
                    key={msg.body}
                    initial={reduced ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-1 overflow-hidden text-xs leading-relaxed text-muted"
                  >
                    {msg.body}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Explicación desplegada */}
              <AnimatePresence initial={false}>
                {topic && !inTour && (
                  <motion.div
                    key={topic}
                    initial={reduced ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-xl border border-border-low bg-elev-1 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                        {TOPICS[topic].title}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/85">
                        {TOPICS[topic].body}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Acciones */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    {inTour ? (
                      <>
                        <button
                          onClick={() =>
                            setTourStep((s) =>
                              s !== null && s < TOUR.length - 1 ? s + 1 : null
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white transition-transform duration-[--dur-micro] hover:-translate-y-px"
                        >
                          {tourStep < TOUR.length - 1 ? "Next" : "Finish"}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <span className="flex items-center gap-1">
                          {TOUR.map((_, i) => (
                            <span
                              key={i}
                              className={`h-1 rounded-full transition-all duration-300 ${
                                i === tourStep
                                  ? "w-4 bg-primary"
                                  : "w-1 bg-border-strong"
                              }`}
                            />
                          ))}
                        </span>
                        <button
                          onClick={() => setTourStep(null)}
                          className="ml-auto text-xs text-muted transition-colors hover:text-white"
                        >
                          Exit
                        </button>
                      </>
                    ) : (
                      <>
                        {msg.actions.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => onAction(a)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border-low bg-elev-1 px-3 py-1.5 text-xs font-semibold text-white/90 transition-all duration-[--dur-micro] hover:-translate-y-px hover:border-primary/40 hover:bg-elev-2"
                          >
                            {a.label}
                            {a.kind === "navigate" && (
                              <ArrowRight className="h-3 w-3" />
                            )}
                          </button>
                        ))}
                        {location.pathname === "/" && (
                          <button
                            onClick={() => setTourStep(0)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white transition-transform duration-[--dur-micro] hover:-translate-y-px"
                          >
                            Start the flow
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Collapse the guide" : "Expand the guide"}
                className="rounded-lg p-1.5 text-muted transition-colors duration-[--dur-micro] hover:text-white"
              >
                <motion.span
                  animate={{ rotate: open ? 0 : 180 }}
                  className="block"
                >
                  <ChevronUp className="h-4 w-4 rotate-180" />
                </motion.span>
              </button>
              <button
                onClick={() => {
                  setHidden(true);
                  setTourStep(null);
                  try {
                    sessionStorage.setItem(DISMISSED, "1");
                  } catch {
                    /* modo privado: no persiste, no pasa nada */
                  }
                }}
                aria-label="Dismiss the guide"
                className="rounded-lg p-1.5 text-muted transition-colors duration-[--dur-micro] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      </div>
    </>
  );
}
