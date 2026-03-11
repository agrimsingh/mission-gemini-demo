"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sidebar, type View } from "./sidebar";

export function AppShell({
  activeView,
  onViewChange,
  readyCount,
  children,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
  readyCount: number;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-0">
      <Sidebar
        activeView={activeView}
        onViewChange={onViewChange}
        readyCount={readyCount}
      />

      <main className="ml-48 flex-1 overflow-y-auto">
        <motion.div
          key={activeView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.12, ease: [0.16, 1, 0.3, 1] }
          }
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
