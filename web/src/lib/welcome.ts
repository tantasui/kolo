const KEY = "kolo.welcomeSeen";

/**
 * Whether this browser has been shown the welcome screens.
 *
 * Not keyed to a person, because the whole point is that it runs before there
 * is one. A second device gets the welcome again, which is the right outcome:
 * it is an explanation, not a setting.
 */
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Private windows and blocked storage: showing it twice is no great harm.
    return false;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Nothing to do; the next visit simply shows it again.
  }
}
