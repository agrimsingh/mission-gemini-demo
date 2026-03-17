"use client";

import { cn } from "@/lib/cn";
import { Disc3, Map, Search, Radio } from "lucide-react";

export type View = "library" | "map" | "search";

const NAV_ITEMS: { id: View; label: string; icon: typeof Disc3 }[] = [
  { id: "library", label: "Library", icon: Disc3 },
  { id: "map", label: "Map", icon: Map },
  { id: "search", label: "Vibe Search", icon: Search },
];

export function Sidebar({
  activeView,
  onViewChange,
  readyCount,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
  readyCount: number;
}) {
  return (
    <nav className="fixed left-0 top-0 z-40 flex h-dvh w-48 flex-col border-r border-border bg-surface-0 py-5">
      <div className="mb-8 flex w-full items-center justify-center gap-2.5 px-4">
        <Radio className="size-6 text-text-secondary" />
        <span className="font-display text-sm font-600 uppercase tracking-widest text-text-secondary">
          Mission
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-500 transition-colors duration-100 ease-out",
                "active:scale-[0.97] active:transition-transform active:duration-75",
                isActive
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-3 pb-2">
        <div className="flex items-center gap-2 py-1.5">
          <span className="inline-flex size-1.5 rounded-full bg-success" />
          <span className="text-xs tabular-nums text-text-tertiary">
            {readyCount} embedded
          </span>
        </div>
      </div>
    </nav>
  );
}
