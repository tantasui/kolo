export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="text-[22px] font-bold tracking-tight">You&apos;re offline</h1>
      <p className="text-[15px] leading-relaxed text-muted">
        Kolo needs a connection to show your balance. Reconnect and pull down to refresh.
      </p>
    </div>
  );
}
