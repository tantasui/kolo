import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-dim",
  secondary: "bg-raised text-text border border-line hover:bg-line",
  ghost: "text-muted hover:text-text",
};

export function Button({
  variant = "primary",
  loading = false,
  full = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} h-14 px-6 text-[17px] ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
