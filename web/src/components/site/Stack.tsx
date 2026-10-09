/**
 * What Kolo actually runs on -- the row that appears twice, on `/` and on
 * `/about`, and so lives in one place.
 *
 * Each project's own mark, taken from a source that project controls and used
 * unchanged: not recoloured, not redrawn, not stretched. That is the whole
 * rule, and several of these brand guidelines say so outright. A wordmark
 * somebody else owns, tinted to our palette, would be worse than no logo.
 *
 * Where each came from, so the next person can refresh one without guessing:
 *
 *   monad.png    monad.xyz favicon (256px)
 *   pimlico.png  github.com/pimlicolabs organisation avatar
 *   privy.png    github.com/privy-io organisation avatar
 *   zerodev.png  github.com/zerodevapp organisation avatar -- Kernel is theirs
 *   agora.svg    the mark out of agora.finance's own nav wordmark, filled with
 *                their `--ausd-green` (#476352) rather than a colour we picked
 *   foundry.png  getfoundry.sh/foundry-logo.png
 *
 * They are files in `public/logos/`, not hotlinks: a logo that 404s because
 * somebody else reorganised their site is a broken page on ours.
 */

export const STACK = [
  { name: "MONAD", src: "/logos/monad.png", href: "https://monad.xyz" },
  { name: "PIMLICO", src: "/logos/pimlico.png", href: "https://pimlico.io" },
  { name: "PRIVY", src: "/logos/privy.png", href: "https://privy.io" },
  {
    name: "KERNEL v0.3",
    src: "/logos/zerodev.png",
    href: "https://zerodev.app",
  },
  { name: "AGORA AUSD", src: "/logos/agora.svg", href: "https://agora.finance" },
  { name: "FOUNDRY", src: "/logos/foundry.png", href: "https://getfoundry.sh" },
];

/**
 * Two of the six are line art with no background of their own, and the other
 * four bring a dark or coloured tile. So on a light background the marks sit
 * straight on it, and on a dark one they all get the same white tile -- which
 * is what a brand guideline asks for anyway, rather than a black mark
 * disappearing into a black section.
 */
export function StackRow({ on = "light" }: { on?: "light" | "dark" }) {
  const dark = on === "dark";

  return (
    <div
      className={`grid grid-cols-2 items-center justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 ${
        dark ? "md:grid-cols-3" : ""
      }`}
    >
      {STACK.map((item) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noreferrer noopener"
          className={`flex items-center gap-2 whitespace-nowrap text-[15px] font-bold tracking-tight
                      transition-opacity hover:opacity-70 sm:text-[17px] ${
                        dark ? "text-card" : "text-deep"
                      }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
              dark ? "bg-card p-0.5" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element --
                a fixed 28px mark gains nothing from the image pipeline. */}
            <img
              src={item.src}
              alt=""
              width={28}
              height={28}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </span>
          {item.name}
        </a>
      ))}
    </div>
  );
}
