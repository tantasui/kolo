# Kolo design system

Kolo is a dark-only, touch-first phone app designed at a **390px viewport**. It
has one job: make sending money feel like sending a message. Every rule below
exists to protect that feeling, and most of them are enforced by discipline
rather than by a linter — so they are written down here.

The raw values live in [`tailwind.config.ts`](tailwind.config.ts) and
[`src/app/globals.css`](src/app/globals.css). That is the source of truth. This
document is how to use them.

---

## Colour

Semantic names only. No raw hex at a call site.

| Token        | Value     | Used for                               |
| ------------ | --------- | -------------------------------------- |
| `ink`        | `#0A0A0C` | the page ground                        |
| `surface`    | `#141419` | cards and inputs                       |
| `raised`     | `#1C1C23` | secondary buttons, chips, skeletons    |
| `line`       | `#26262F` | borders and dividers                   |
| `text`       | `#F7F7F8` | primary text                           |
| `muted`      | `#84848F` | labels, captions, secondary text       |
| `accent`     | `#D2FF3A` | the one action, and affirmative states |
| `accent-dim` | `#A8CC2E` | accent hover                           |
| `inbound`    | `#5CE39B` | money coming in                        |
| `danger`     | `#FF6B6B` | errors and destructive states          |

**Accent is scarce.** A screen gets one accent action — the thing you want the
user to tap. Beyond that it marks affirmation only: a handle is available, the
fee is nothing, the payment landed. Text on an accent ground is always
`text-ink`, never white.

**`inbound` is reserved for money arriving.** Outgoing amounts are plain
`text-text`. Green means _you received something_, and nothing else.

**There is no light theme.** `color-scheme: dark` is fixed in `globals.css`.
Don't add `dark:` variants; there is nothing to vary against.

---

## Type

Sizes are arbitrary pixel values, not Tailwind's `text-sm`/`text-lg` scale,
because this is one designed surface rather than a general-purpose system.

| Size        | Role                                           |
| ----------- | ---------------------------------------------- |
| 13px        | captions, timestamps, helper text              |
| 14px        | section labels ("Balance", "Activity")         |
| 15px        | body and secondary text — the most common size |
| 16–17px     | list row titles, primary body, button labels   |
| 26–28px     | text inputs, wordmark                          |
| 32–44px     | screen headings                                |
| **52–60px** | **money**                                      |

**Money is always the largest element on its screen.** The balance is 52px, the
keypad entry is 60px, the success amount is 34px. If a new screen shows an
amount, it should dominate.

Any numeral that can change carries the **`.tabular`** class
(`font-variant-numeric: tabular-nums`), so digits don't jitter when a balance
updates mid-animation.

### Never render an amount without a currency

The chain always holds 6-decimal dollars. What the user _sees_ is their choice
in Settings — dollars or naira — so every amount goes through the currency-aware
helpers in [`src/lib/format.ts`](src/lib/format.ts):

```tsx
const { currency } = useKolo();
formatMoney(balance, currency); // raw units -> "$100.00" / "₦161,500.00"
parseAmount(entry, currency); // typed entry -> raw units
formatEntry(entry, currency); // in-progress keypad entry
```

This includes the keypad. A screen that shows a naira balance next to a dollar
entry field is a bug, not a partial feature. The rate is display-only and comes
from `getRate()` in [`src/config.ts`](src/config.ts) — never inline it.

The two currencies are shaped differently, and both shapes are deliberate:

|                | Dollars             | Naira                                  |
| -------------- | ------------------- | -------------------------------------- |
| Decimals       | 2                   | **0** — kobo are noise at ₦1,615 to $1 |
| Rounding       | to the nearest cent | **always down**                        |
| Secondary line | none                | muted `≈ $100.00`                      |
| Keypad `.` key | shown               | **refused**, cell left blank           |

Naira floors rather than rounds because it is a _view_ onto a dollar balance:
flooring means the figure on screen never overstates what is held, so the whole
displayed balance is always spendable. Round it to nearest and a user can be
shown ₦1,615, type ₦1,615, and be told it is more than their balance.

Naira never appears alone where the amount matters. The balance and the send
review both carry `formatApprox()`'s muted dollar line beneath, so the converted
figure and the real one are always legible together.

---

## Shape and size

Radius signals affordance:

- `rounded-pill` — buttons and chips. **Pill means tappable.**
- `rounded-2xl` — containers: cards, inputs, list rows, notices.
- `rounded-full` — avatars and icon buttons.

Heights are fixed so controls line up across screens:

| Height     | Control                                      |
| ---------- | -------------------------------------------- |
| `h-14`     | full-width primary button                    |
| `h-[54px]` | the Home button pair (Send / Add demo funds) |
| `h-16`     | keypad keys                                  |
| `h-10`     | icon buttons (back, close)                   |
| `h-9`      | inline chips                                 |

---

## Touch

**Press feedback is mandatory.** Every tappable element scales on press:

- `active:scale-[0.98]` — large buttons
- `active:scale-95` — icon buttons
- `active:scale-[0.99]` — wide cards

**Never ship a hover-only affordance.** Most users are on a phone and will never
produce a hover event. Tap highlight is suppressed globally
(`-webkit-tap-highlight-color: transparent`), so the scale _is_ the feedback — if
you omit it, the control feels dead.

---

## Layout

Every screen is the same shell:

```tsx
<div className="flex min-h-[100dvh] flex-col px-5 pb-10 pt-6">
```

- **`100dvh`, never `100vh`** — mobile browser chrome makes `vh` wrong.
- Horizontal padding is `px-5` or `px-6`, consistent within a screen.
- The root layout pins a `max-w-md` centred column, so a desktop browser shows a
  phone rather than a stretched app.
- `viewportFit: cover` lets the app paint under the notch and home indicator.

---

## Motion

Four named animations, all on `cubic-bezier(0.22, 1, 0.36, 1)`:

| Animation    | Duration | Used for                     |
| ------------ | -------- | ---------------------------- |
| `rise-in`    | 320ms    | screen entrances             |
| `sheet-up`   | 280ms    | the send sheet               |
| `pop-in`     | 420ms    | the success badge            |
| `draw-check` | 320ms    | the success checkmark stroke |

`globals.css` neutralises all animation under `prefers-reduced-motion`, and
`Confetti` re-checks the query in JavaScript before it draws a single frame —
a CSS override cannot stop a canvas loop.

---

## Icons

Hand-rolled inline SVG in [`src/components/ui/Icons.tsx`](src/components/ui/Icons.tsx).
There is no icon library, and adding one is not a small decision.

```tsx
export const Plus = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);
```

- 24×24 viewBox, `fill="none"`, `stroke="currentColor"`.
- `strokeWidth` **2.2** for action glyphs, **1.8** for detail glyphs.
- Always `aria-hidden` — the accessible name belongs on the button.
- Sized by `className` (`h-4`, `h-5`, `h-6`), never by width/height attributes.

**Avatars** derive a colour from a hash of the handle across six tones, always
with dark text, so the same person is the same colour everywhere in the feed.

---

## State

**Model UI state as a discriminated union, not a set of booleans.** Three
booleans give eight states, most of which are nonsense; a union gives exactly the
states that exist, and the compiler checks you handled them all.

```ts
type Availability =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "unknown" };
```

Render it through an exhaustive `switch`. See `ClaimHandle.tsx` and the `Lookup`
type in `SendSheet.tsx`.

**Async lookups debounce and discard stale responses.** Every
type-ahead check waits ~320–350ms, then guards its own result with a
monotonically increasing ticket, so a slow early request can never overwrite a
fast later one:

```ts
const ticket = ++requestRef.current;
const result = await lookUp(value);
if (ticket !== requestRef.current) return; // a newer query already won
```

---

## Language

The UI is held to a small vocabulary. It says:

> Balance · Send · Add demo funds · @handle · No fee · Note · Sending…

It **never** says: _wallet, gas, transaction, hash, blockchain, Monad, token,
approve, sign, smart account, wei, address, crypto_ — not in labels, not in
placeholders, not in `aria-label`s, not in error text, not in empty states.

The whole product thesis is that the user never learns there is a blockchain
underneath. One leaked word breaks the illusion, and reads to a non-crypto user
as a bug rather than as information.

### Failures

Failures are generic and reassuring on screen. The real error goes to the
console, prefixed `[kolo]`:

```ts
console.error("[kolo] send failed", error);
setStep("failed");
```

The only user-facing failure strings that exist are:

| Message                                | Cause                   |
| -------------------------------------- | ----------------------- |
| "Something went wrong — try again"     | the catch-all           |
| "You've already added funds this hour" | faucet `CooldownActive` |
| "Demo funds have run out for now"      | faucet `FaucetEmpty`    |

Failure copy reassures about money first — the send failure screen leads with
_"Your money hasn't moved."_

> **Watch out:** the two specific faucet messages are produced by string-matching
> the custom error name out of the revert
> (`String(error).includes("CooldownActive")`) in `screens/Home.tsx`. A new
> contract error will **silently fall through to the catch-all** unless it is
> matched there too.

---

## Adding a screen

1. Copy the shell and header from an existing screen rather than composing fresh.
2. Pick sizes off the ladders above; don't introduce a new one without a reason.
3. Give the screen exactly one accent action.
4. Model its states as a union, and switch exhaustively over them.
5. Give every tappable thing an `active:scale-*` and an accessible name.
6. Render every amount through `formatMoney(units, currency)` — never bare.
7. Write the copy as if for a consumer banking app with nothing underneath it.

---

## Outside the app: the public pages

Everything above governs **the app**, which now lives at `/app` — the
phone-width surface behind sign-in. Two pages are not the app, and they are
where the rules above are deliberately bent. The bends are written down so they
stay bounded and nobody has to guess next time.

|                                             |                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`/`](<src/app/(site)/page.tsx>)            | The landing page. Written for one person: somebody who needs to pay somebody.                         |
| [`/about`](<src/app/(site)/about/page.tsx>) | The long answer. Written for somebody auditing Kolo, and linked once, from the landing page's footer. |

**Which page a thing belongs on is the first question, not the last.** `/about`
began life as the landing page and failed at it, because it opened on `0 wei`
and `192/192`, named Kernel v0.3.1 in a spec grid, and built a section around
contract counts. All of that is true, and none of it answers the only question
a visitor has. If a sentence is proof rather than a promise, it belongs on
`/about`.

| Rule                    | What the public pages do instead               | Why                                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 390px phone column      | A desktop grid, single column on a phone       | They are web pages, read on a laptop as often as a phone. The phone column lives in `app/(app)/layout.tsx`, so the root layout no longer imposes it on everything.                                           |
| One typeface            | Adds JetBrains Mono, for tags and figures only | A measurement should read as a measurement. Loaded in `app/(site)/layout.tsx`, scoped to the route group, so the app pays nothing for it.                                                                    |
| Four animations         | Adds `reveal-up`, on the same curve            | Section entry on scroll, via `site/Reveal.tsx`. Fires once, never hides anything in the markup, and collapses to nothing under `prefers-reduced-motion`.                                                     |
| Hand-rolled icons       | Still hand-rolled, in `site/Icons.tsx`         | The pages needed seventeen the app does not have. **The no-icon-font rule does not bend**: a webfont for glyphs costs a round trip and renders as tofu before it lands.                                      |
| The vocabulary ban-list | Held on `/`, waived on `/about`                | The landing page keeps the app's vocabulary — it is addressed to the same person the app is. `/about` names the machinery freely, because a reader who has clicked through to it has asked for exactly that. |

**Other people's logos are the one exception to hand-rolled artwork.** The
"what Kolo actually runs on" row on both pages ships four marks we did not
draw, in [`site/Stack.tsx`](src/components/site/Stack.tsx), and the rule for
them is the opposite of the rule for ours: **used unchanged**. Not recoloured,
not redrawn, not stretched, not tinted to our palette — several of those brand
guidelines forbid exactly that, and a logo bent to fit a page reads as careless
rather than as design. Each file is committed under `public/logos/` with its
source in the component's header comment, never hotlinked, because a mark that
404s when somebody else reorganises their site is a broken page on ours. On a
light background the marks sit straight on it; on a dark one they all get the
same white tile, which is what the guidelines ask for and stops the black ones
vanishing.

Three things are **not** negotiable, and the header comment on each page says so
at more length:

1. **No claim the repository or the chain cannot back.** No funding, no
   auditors, no press, no user counts, no latency or throughput figures, no
   feature that is not built.
2. **Addresses and amounts are read from `config`**, never retyped, so neither
   page can drift from the deployment.
3. **The two uncomfortable answers stay on `/`.** A payment cannot be undone,
   and the amounts are public. They sit in the questions section rather than
   being left for somebody to discover, because they are the two facts that
   decide whether the rest of the page is believable.

### Routing

`/` and `/about` are the public pages. `/app` is the product. `/claim`,
`/circle/join` and `/pot/join` keep their URLs because they are links people
have already been sent. `manifest.json` points `start_url` at `/app` so an
installed home-screen icon opens the product and not the advertisement, while
`scope` stays `/` so the share links still open inside the installed app.
