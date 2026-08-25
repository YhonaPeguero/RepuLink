import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Revelado al entrar en viewport. Una sola vez, desplazamiento corto: se lee
 * como una entrada, no como un carrusel de animaciones.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cifra que cuenta hasta su valor al entrar en pantalla. Con movimiento
 * reducido aparece ya en su valor final.
 */
export function CountUp({
  to,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [shown, setShown] = useState(reduced ? to : 0);
  const done = useRef(reduced);

  useEffect(() => {
    if (done.current) return;

    const run = () => {
      if (done.current) return;
      done.current = true;
      let raf = 0;
      const start = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = Math.min((t - start) / dur, 1);
        // easeOutExpo: arranca rápido y frena, que es como se lee un contador.
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setShown(to * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    };

    if (inView) return run();

    // Red de seguridad: si el contador nunca entra en viewport (pestaña de
    // fondo, captura, viewport corto), se muestra el valor real igualmente.
    // Un "0%" congelado no es solo feo: aquí sería una cifra falsa.
    const t = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        setShown(to);
      }
    }, 1600);
    return () => clearTimeout(t);
  }, [inView, to, reduced]);

  return (
    <span ref={ref} className="tabular">
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * Atracción magnética hacia el cursor. Se reserva para UN solo elemento focal
 * por pantalla: aplicado a varios se vuelve ruido.
 */
export function Magnetic({
  children,
  strength = 0.25,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 22 });
  const y = useSpring(my, { stiffness: 260, damping: 22 });
  const tx = useTransform(x, (v) => v);
  const ty = useTransform(y, (v) => v);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    // Handler con nombre estable para poder retirarlo en la limpieza.
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left - r.width / 2) * strength);
      my.set((e.clientY - r.top - r.height / 2) * strength);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [mx, my, strength, reduced]);

  return (
    <motion.div ref={ref} style={{ x: tx, y: ty }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Cinta horizontal en bucle. Duplica el contenido para que el bucle no tenga
 * costura, y se detiene con movimiento reducido.
 */
export function Marquee({
  children,
  duration = 38,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div
        className="flex shrink-0 gap-3 pr-3"
        style={
          reduced
            ? undefined
            : { animation: `marquee ${duration}s linear infinite` }
        }
      >
        {children}
      </div>
      {!reduced && (
        <div
          className="flex shrink-0 gap-3 pr-3"
          style={{ animation: `marquee ${duration}s linear infinite` }}
          aria-hidden
        >
          {children}
        </div>
      )}
    </div>
  );
}
