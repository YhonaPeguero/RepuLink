import { useId } from "react";
import { motion } from "framer-motion";

/**
 * Avatar de una parte del acuerdo.
 *
 * Un orbe con degradado, que es el lenguaje visual que ya usan las wallets de
 * Solana para representar una cuenta. Sustituye a la inicial dentro de un
 * cuadrado, que no decía nada y se veía a medio hacer.
 *
 * El degradado es determinista: la misma semilla da siempre el mismo avatar,
 * así que una wallet concreta se reconoce de una pantalla a otra.
 */

const PALETTES: [string, string, string][] = [
  ["#9945FF", "#5B8DEF", "#14F195"],
  ["#F472B6", "#9945FF", "#38BDF8"],
  ["#FBBF24", "#FB7185", "#9945FF"],
  ["#34D399", "#3B82F6", "#A78BFA"],
  ["#38BDF8", "#818CF8", "#F472B6"],
  ["#FB923C", "#F43F5E", "#9945FF"],
];

/** Hash estable de una cadena a un índice de paleta y un ángulo. */
function seedOf(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return {
    palette: PALETTES[h % PALETTES.length],
    angle: h % 360,
  };
}

export function PartyAvatar({
  seed,
  size = 56,
  active = false,
  className = "",
}: {
  seed: string;
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const { palette, angle } = seedOf(seed);
  const [a, b, c] = palette;
  // useId garantiza un id único por instancia: dos avatares con el mismo id
  // dejaban el gradiente sin resolver y el círculo salía vacío.
  const uid = useId().replace(/:/g, "");
  const id = `av-${uid}`;

  return (
    <motion.div
      animate={{ scale: active ? 1.06 : 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Halo cuando la parte está actuando */}
      <motion.div
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="absolute -inset-1 rounded-full blur-md"
        style={{ background: `linear-gradient(${angle}deg, ${a}, ${c})` }}
      />
      <svg
        viewBox="0 0 64 64"
        className="relative h-full w-full rounded-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={id} gradientTransform={`rotate(${angle} .5 .5)`}>
            <stop offset="0%" stopColor={a} />
            <stop offset="55%" stopColor={b} />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
          <radialGradient id={`${id}-s`} cx="32%" cy="26%" r="72%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill={`url(#${id})`} />
        {/* Brillo especular: le da volumen y lo saca de lo plano */}
        <circle cx="32" cy="32" r="32" fill={`url(#${id}-s)`} />
        <circle
          cx="32"
          cy="32"
          r="31"
          fill="none"
          stroke="rgba(255,255,255,.28)"
          strokeWidth="1.5"
        />
      </svg>
    </motion.div>
  );
}
