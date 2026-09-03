interface SplashScreenProps {
  exiting: boolean;
}

export function SplashScreen({ exiting }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-0 ${
        exiting ? "pv-splash-exit" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border"
            style={{ animation: "pv-splash-pulse 1.5s ease-in-out infinite" }}
          >
            <img src="/logo.png" alt="Photovibe" className="h-10 w-10 object-contain" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-light tracking-[0.2em] text-text">
            Photovibe
          </h1>
          <p className="mt-2 text-[11px] text-text-muted">
            Loading editor…
          </p>
        </div>

        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent"
            style={{
              animation: "pv-splash-load 1.8s ease-in-out infinite",
              width: "40%",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pv-splash-load {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
