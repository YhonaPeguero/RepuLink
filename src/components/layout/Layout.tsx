import { type PropsWithChildren } from "react";
import { motion } from "framer-motion";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      {/* Animated Blockchain Grid */}
      <div className="aurora" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid-pattern opacity-[0.35]" />

      <div className="relative z-10">
        <Header />
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          // Entrada con cuerpo, salida corta: atrás/adelante se siente ágil
          // porque la transición de salida nunca bloquea la navegación.
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.16 } }}
          className="mx-auto max-w-6xl px-6 py-8 lg:py-12"
        >
          {children}
        </motion.main>
        <Footer />
        {/* Hueco para que el riel de la guía no tape el pie */}
        <div className="h-24" aria-hidden />
      </div>
    </div>
  );
}
