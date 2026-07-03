export function DashboardFooter() {
  const tile = "inline-flex items-center rounded-lg bg-white";
  const tileShadow = { boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)" } as const;

  return (
    <footer
      className="relative mt-32 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--color-ink-strong) 0%, #020617 100%)",
        color: "#ffffff",
      }}
    >
      {/* Faint Altus Corp watermark, centred behind */}
      <img
        src="/altus-corp-logo.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ height: 240, width: "auto", opacity: 0.06 }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col items-center gap-3 px-6 py-10 text-center">
        {/* TOP — A A Tech logo */}
        <div className={`${tile} px-3 py-2`} style={tileShadow}>
          <img src="/logo.png" alt="A A Tech" style={{ height: 36, width: "auto", display: "block" }} />
        </div>

        {/* MIDDLE — Powered by */}
        <p
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(255, 255, 255, 0.5)" }}
        >
          Powered by
        </p>

        {/* BOTTOM — Altus Corp logo (larger) */}
        <div className={`${tile} px-4 py-2.5`} style={tileShadow}>
          <img src="/altus-corp-logo.png" alt="Altus Corp" style={{ height: 58, width: "auto", display: "block" }} />
        </div>

        <p className="mt-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          © A A Tech 2025–2035 · All rights reserved
        </p>
      </div>
    </footer>
  );
}
