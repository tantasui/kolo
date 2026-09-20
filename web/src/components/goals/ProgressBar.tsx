/** A goal's progress, drawn. Full and lit once the goal has been reached. */
export function ProgressBar({ percent, reached }: { percent: number; reached: boolean }) {
  return (
    <div
      className="mt-3 h-2 overflow-hidden rounded-pill bg-raised"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className={`h-full rounded-pill transition-all duration-500 ${reached ? "bg-accent" : "bg-text/70"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
