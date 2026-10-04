const KEY = "kolo.wantedHandle";

/**
 * A handle typed on `/about`, carried across the hop into the app.
 *
 * Someone who types their name into the page and taps the button has already
 * decided; making them type it a second time on the next screen is a small
 * insult. It is `sessionStorage` rather than a query string so the handle does
 * not sit in the address bar or in anybody's history, and it is read once and
 * cleared -- a stale intent from last week should not pre-fill anything.
 */
export function rememberWantedHandle(handle: string): void {
  try {
    sessionStorage.setItem(KEY, handle);
  } catch {
    // Private windows and blocked storage: losing the pre-fill is not a failure.
  }
}

/** Read it and clear it. Returns "" when there is nothing waiting. */
export function takeWantedHandle(): string {
  try {
    const value = sessionStorage.getItem(KEY) ?? "";
    sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return "";
  }
}
