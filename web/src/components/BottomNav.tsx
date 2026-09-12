"use client";

import { Circle, House } from "./ui/Icons";

export type Tab = "home" | "circles";

/**
 * The two places there are.
 *
 * Sends are a thing you do from your balance, so Home keeps them; Circles is
 * the standing commitment you come back to. A badge rather than a number: the
 * point is that one of them wants you, not how many.
 */
export function BottomNav({
  tab,
  onChange,
  circlesNeedYou,
}: {
  tab: Tab;
  onChange: (next: Tab) => void;
  circlesNeedYou: boolean;
}) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-ink/95 backdrop-blur"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex">
        <Item
          label="Home"
          selected={tab === "home"}
          onSelect={() => onChange("home")}
          icon={<House className="h-6 w-6" />}
        />
        <Item
          label="Circles"
          selected={tab === "circles"}
          onSelect={() => onChange("circles")}
          icon={<Circle className="h-6 w-6" />}
          badge={circlesNeedYou}
        />
      </div>
    </nav>
  );
}

function Item({
  label,
  selected,
  onSelect,
  icon,
  badge = false,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2.5 transition
                  ${selected ? "text-text" : "text-muted"}`}
    >
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -right-2.5 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-ink" aria-hidden />
        )}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
