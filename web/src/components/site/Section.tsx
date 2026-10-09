import { Reveal } from "./Reveal";

/**
 * The parts every section of the public page at `/` is built from.
 *
 * One set of primitives rather than markup repeated nine times, so the rhythm
 * -- tag, heading, lede, content -- and the vertical spacing are the same all
 * the way down, and a new section cannot invent its own.
 */

/**
 * Small uppercase label above a heading.
 *
 * Sans by default, because most of this page is addressed to someone who is
 * not an engineer and a monospace label makes ordinary words look like
 * telemetry. `mono` is for the technical section, where a label genuinely is
 * a field name.
 */
export function Tag({
  children,
  tone = "muted",
  mono = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
  mono?: boolean;
  /** For the light sections, which need a colour the dark tones cannot give. */
  className?: string;
}) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.16em]
                  ${mono ? "font-mono" : ""}
                  ${className || (tone === "accent" ? "text-accent" : "text-muted")}`}
    >
      {children}
    </span>
  );
}

export function Section({
  id,
  tag,
  heading,
  lede,
  aside,
  center = false,
  children,
}: {
  id?: string;
  tag?: string;
  heading: string;
  lede?: string;
  /** Prose that sits beside the heading instead of under it, as a wide row. */
  aside?: string;
  center?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 border-t border-line py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal>
          <div
            className={
              aside
                ? "flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
                : center
                  ? "mx-auto max-w-2xl text-center"
                  : ""
            }
          >
            <div>
              {tag && <Tag>{tag}</Tag>}
              <h2
                className={`mt-3 text-[30px] font-bold leading-[1.08] tracking-tight md:text-[40px]
                            ${aside ? "max-w-2xl" : center ? "" : "max-w-3xl"}`}
              >
                {heading}
              </h2>
              {lede && !aside && (
                <p
                  className={`mt-4 text-[17px] leading-relaxed text-muted ${center ? "" : "max-w-2xl"}`}
                >
                  {lede}
                </p>
              )}
            </div>
            {aside && (
              <p className="max-w-md text-[16px] leading-relaxed text-muted">
                {aside}
              </p>
            )}
          </div>
        </Reveal>

        {children && <div className="mt-10 md:mt-14">{children}</div>}
      </div>
    </section>
  );
}

/**
 * A panel. The hover lift is two pixels and the border warms by one step --
 * enough to say "this is a thing" on a pointer device, not enough to be a
 * noticeable animation.
 */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl2 border border-line bg-surface p-6 transition duration-200
                  hover:-translate-y-0.5 hover:border-muted/40 md:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

/** Icon, title, prose, and an optional strip of its own at the bottom. */
export function FeatureCard({
  icon,
  title,
  footer,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-raised text-muted">
        {icon}
      </span>
      <h3 className="mt-5 text-[20px] font-semibold tracking-tight">{title}</h3>
      <div className="mt-2.5 space-y-2.5 text-[15px] leading-relaxed text-muted">
        {children}
      </div>
      {footer && <div className="mt-6 flex-1 content-end">{footer}</div>}
    </Card>
  );
}

/**
 * The shape the stack is described in: what layer, what it is, and two facts
 * on a footer rule. Reads as a spec sheet rather than as a sales card.
 */
export function SpecCard({
  layer,
  name,
  left,
  right,
}: {
  layer: string;
  name: string;
  left: string;
  right: string;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <Tag>{layer}</Tag>
        <p className="mt-2 text-[22px] font-bold tracking-tight">{name}</p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 font-mono text-[12px]">
        <span className="text-muted">{left}</span>
        <span className="text-text">{right}</span>
      </div>
    </Card>
  );
}

/** A small panel inside a feature card: the diagram, the chip, the figures. */
export function Inset({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-raised px-4 py-3.5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Code({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <code
      className={`rounded-lg border border-line bg-raised px-2 py-1 font-mono text-[12px] text-muted ${className}`}
    >
      {children}
    </code>
  );
}
