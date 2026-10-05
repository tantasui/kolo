/**
 * The browser's own speech recognition and speech synthesis, behind a small
 * promise-shaped surface. No library and no server of ours: Chrome and Safari
 * ship both.
 *
 * Recognition is not in TypeScript's DOM types, so the little of it Kolo uses
 * is declared here.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Can this browser listen at all? Call only after mount, never during render on the server. */
export function speechSupported(): boolean {
  return recognitionConstructor() !== null;
}

export type ListenOutcome =
  | { kind: "heard"; text: string }
  | { kind: "silent" }
  | { kind: "denied" }
  | { kind: "failed" };

export interface Listening {
  result: Promise<ListenOutcome>;
  /** Stop and keep what was heard so far. */
  stop: () => void;
  /** Stop and throw it away. */
  cancel: () => void;
}

function language(): string {
  const preferred = typeof navigator !== "undefined" ? navigator.language : "";
  return preferred.toLowerCase().startsWith("en") ? preferred : "en-NG";
}

/**
 * Listen for one utterance. `onInterim` sees the words as they arrive, so the
 * screen can show them being heard.
 */
export function listen(onInterim?: (text: string) => void): Listening {
  const Constructor = recognitionConstructor();
  if (!Constructor) {
    return { result: Promise.resolve({ kind: "failed" }), stop: () => {}, cancel: () => {} };
  }

  const recognition = new Constructor();
  recognition.lang = language();
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalText = "";
  let latest = "";
  let outcome: ListenOutcome | null = null;
  let cancelled = false;

  const result = new Promise<ListenOutcome>((resolve) => {
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i];
        if (piece.isFinal) finalText += piece[0].transcript;
        else interim += piece[0].transcript;
      }
      latest = `${finalText}${interim}`.trim();
      onInterim?.(latest);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        outcome = { kind: "denied" };
      } else if (event.error === "no-speech" || event.error === "aborted") {
        outcome = { kind: "silent" };
      } else {
        console.error("[kolo] speech recognition failed", event.error);
        outcome = { kind: "failed" };
      }
    };

    recognition.onend = () => {
      if (cancelled) return resolve({ kind: "silent" });
      const text = (finalText || latest).trim();
      if (text) return resolve({ kind: "heard", text });
      resolve(outcome ?? { kind: "silent" });
    };
  });

  try {
    recognition.start();
  } catch (error) {
    console.error("[kolo] could not start listening", error);
    return { result: Promise.resolve({ kind: "failed" }), stop: () => {}, cancel: () => {} };
  }

  return {
    result,
    stop: () => recognition.stop(),
    cancel: () => {
      cancelled = true;
      recognition.abort();
    },
  };
}

/**
 * Say something out loud. Resolves when it has been said, or straight away
 * where the browser cannot speak -- the words are always on screen too.
 */
export function speak(text: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language();
    // Some browsers never fire `end` if speech is interrupted; don't wait forever.
    const fallback = setTimeout(resolve, 8_000);
    const done = () => {
      clearTimeout(fallback);
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
