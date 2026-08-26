import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, X } from "lucide-react";
import { CompanionAvatar } from "./CompanionAvatar";

/**
 * Lo primero que ve alguien que llega sin saber qué es esto.
 *
 * Va en el centro y no abajo por una razón concreta: en el riel inferior el
 * mensaje competía con el contenido y se ignoraba. Aquí ocupa el momento en
 * que la persona todavía no está leyendo nada más.
 *
 * Aparece UNA vez por navegador. Se cierra con la X o con Escape, y a partir
 * de ahí la guía vive discreta en el riel de abajo.
 */

const HIGHLIGHTS = [
  { k: "Escrow", v: "The money is locked before any work starts" },
  { k: "Outcome", v: "Released, refunded, or split by an arbiter" },
  { k: "Record", v: "A settled agreement leaves a credential on-chain" },
];

export function CompanionWelcome({
  onTour,
  onDismiss,
}: {
  onTour: () => void;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to RepuLink"
      onKeyDown={(e) => e.key === "Escape" && onDismiss()}
    >
      {/* Clic fuera para cerrar: nunca dejar a alguien atrapado en una guía */}
      <button
        className="absolute inset-0 cursor-default"
        aria-label="Dismiss"
        onClick={onDismiss}
        tabIndex={-1}
      />

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border-low bg-elev-1/95 p-7 shadow-[0_30px_80px_-20px_rgba(153,69,255,0.45)] backdrop-blur-2xl sm:p-9"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-[70px]" />

        <button
          onClick={onDismiss}
          aria-label="Dismiss the guide"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition-colors duration-[--dur-micro] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          <motion.div
            initial={reduced ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.55,
              ease: [0.34, 1.4, 0.64, 1],
              delay: 0.2,
            }}
          >
            <CompanionAvatar size={60} speaking />
          </motion.div>

          <motion.h2
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.45 }}
            className="mt-6 font-heading text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl"
          >
            First time here?
            <br />
            <span className="text-brand-gradient">Let me show you.</span>
          </motion.h2>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.45 }}
            className="mt-3 text-sm leading-relaxed text-muted"
          >
            RepuLink escrows the payment for an agreement and turns the outcome
            into a credential. Two minutes, no wallet needed.
          </motion.p>

          <motion.dl
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.45 }}
            className="mt-6 space-y-2.5 border-y border-border-low py-5"
          >
            {HIGHLIGHTS.map(({ k, v }, i) => (
              <motion.div
                key={k}
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.56 + i * 0.07, duration: 0.4 }}
                className="flex items-baseline gap-3"
              >
                <dt className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary-light">
                  {k}
                </dt>
                <dd className="text-xs leading-relaxed text-white/80">{v}</dd>
              </motion.div>
            ))}
          </motion.dl>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.45 }}
            className="mt-6 flex flex-wrap gap-2.5"
          >
            <button
              onClick={onTour}
              className="group inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(153,69,255,0.8)] transition-transform duration-[--dur-micro] hover:-translate-y-0.5"
            >
              <Compass className="h-4 w-4" />
              Show me around
              <ArrowRight className="h-4 w-4 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onDismiss}
              className="inline-flex items-center rounded-xl border border-border-low bg-elev-2 px-5 py-3 text-sm font-semibold text-white/85 transition-all duration-[--dur-micro] hover:-translate-y-0.5 hover:text-white"
            >
              I'll explore on my own
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
