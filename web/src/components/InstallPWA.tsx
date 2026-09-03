"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const isInstalled = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.navigator as any).standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

const DISMISS_KEY = "kolo:install-dismissed";

/** A quiet nudge to add Kolo to the home screen. Never blocks the app. */
export function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isInstalled()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    setDismissed(false);
    if (isIOS()) setShowIOSHint(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed || (!prompt && !showIOSHint)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-5 pb-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-raised/95 px-4 py-3 backdrop-blur">
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-text">Add Kolo to your home screen</p>
          <p className="text-[13px] text-muted">
            {prompt ? "One tap, and it opens like an app." : "Tap Share, then Add to Home Screen."}
          </p>
        </div>

        {prompt ? (
          <button
            type="button"
            onClick={() => {
              void prompt.prompt();
              dismiss();
            }}
            className="h-9 rounded-pill bg-accent px-4 text-[14px] font-semibold text-ink"
          >
            Add
          </button>
        ) : (
          <button
            type="button"
            onClick={dismiss}
            className="h-9 rounded-pill px-3 text-[14px] font-semibold text-muted"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
