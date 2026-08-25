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
 * Carril horizontal desplazable.
 *
 * Antes era una cinta que solo se miraba: no se podía arrastrar ni llegar a los
 * extremos. Ahora es scroll real (rueda, arrastre y teclado), con deriva
 * automática que se detiene en cuanto el usuario interactúa.
 */
export function DragRail({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Deriva lenta: da vida sin secuestrar el scroll. Se para al interactuar.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (el.scrollWidth - el.clientWidth > 4) {
        el.scrollLeft += dt * 0.022;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1)
          el.scrollLeft = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, paused]);

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  };

  const nudge = (dir: -1 | 1) => {
    setPaused(true);
    ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  // Arrastre con puntero, con handlers estables para poder limpiarlos.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      down = true;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      setPaused(true);
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      el.scrollLeft = startLeft - (e.clientX - startX);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div
      className={`group/rail relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={ref}
        onScroll={sync}
        tabIndex={0}
        role="region"
        aria-label="Use cases"
        className="flex cursor-grab gap-3 overflow-x-auto scroll-smooth pb-1 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <RailButton side="left" onClick={() => nudge(-1)} hidden={atStart} />
      <RailButton side="right" onClick={() => nudge(1)} hidden={atEnd} />
    </div>
  );
}

function RailButton({
  side,
  onClick,
  hidden,
}: {
  side: "left" | "right";
  onClick: () => void;
  hidden: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-low bg-background/90 text-muted backdrop-blur transition-all duration-[--dur-fast] hover:border-primary/40 hover:text-white ${
        side === "left" ? "-left-2" : "-right-2"
      } ${hidden ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d={side === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
