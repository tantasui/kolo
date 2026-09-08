"use client";

import { ChevronLeft, Close } from "./Icons";

/**
 * The header every full-screen sheet wears: optional back, title, close.
 * Shared so the send and settings sheets stay identical rather than drifting.
 */
export function SheetHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <header className="flex items-center gap-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:scale-95"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : (
        <span className="w-2" />
      )}

      <h1 className="flex-1 truncate text-[17px] font-semibold">{title}</h1>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:scale-95"
      >
        <Close className="h-5 w-5" />
      </button>
    </header>
  );
}
