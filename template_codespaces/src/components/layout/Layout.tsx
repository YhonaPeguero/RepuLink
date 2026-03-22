import { type PropsWithChildren } from "react";
import { motion } from "framer-motion";
import { Header } from "./Header";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      {/* Animated Blockchain Grid */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 z-0" />
      
      <div className="relative z-10">
        <Header />
        <motion.main 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-auto max-w-5xl px-6 py-10 lg:py-16"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}