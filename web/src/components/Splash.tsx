import { KoloMark } from "./ui/Wordmark";

export function Splash({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5">
      <span className="animate-pulse">
        <KoloMark size={52} />
      </span>
      {label && <p className="text-[15px] text-muted">{label}</p>}
    </div>
  );
}
