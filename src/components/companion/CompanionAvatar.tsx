import { motion, useReducedMotion } from "framer-motion";

/**
 * La cara de la guía.
 *
 * No es una mascota: es el escudo de RepuLink convertido en presencia. Un aro
 * que respira, un halo que late y el logo dentro. Reutiliza el lenguaje de los
 * orbes que ya usan las partes de un acuerdo, así que se siente parte del
 * producto y no un personaje pegado encima.
 *
 * `tone` la tiñe del color del estado actual, igual que el rail: la guía
 * cambia de color cuando cambia el acuerdo que estás mirando.
 */
const GLOW: Record<string, string> = {
  brand: "rgba(153,69,255,0.55)",
  funded: "rgba(59,130,246,0.55)",
  active: "rgba(251,191,36,0.5)",
  done: "rgba(52,211,153,0.55)",
  idle: "rgba(161,161,170,0.35)",
  alert: "rgba(248,113,113,0.5)",
};

export function CompanionAvatar({
  size = 44,
  tone = "brand",
  speaking = false,
}: {
  size?: number;
  tone?: string;
  speaking?: boolean;
}) {
  const reduced = useReducedMotion();
  const glow = GLOW[tone] ?? GLOW.brand;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Halo: late más rápido cuando acaba de decir algo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: glow, filter: "blur(10px)" }}
        animate={
          reduced
            ? { opacity: 0.5 }
            : { opacity: speaking ? [0.45, 0.9, 0.45] : [0.3, 0.55, 0.3] }
        }
        transition={{
          duration: speaking ? 1.1 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Aro que respira */}
      <motion.div
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: glow }}
        animate={
          reduced ? {} : { scale: speaking ? [1, 1.12, 1] : [1, 1.05, 1] }
        }
        transition={{
          duration: speaking ? 1.1 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* El escudo */}
      <div className="absolute inset-[3px] overflow-hidden rounded-full border border-white/10 bg-background">
        <img
          src="/logo-repulink-128.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
