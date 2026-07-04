export function DashboardFooter() {
  return (
    <footer
      className="relative mt-32 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--color-ink-strong) 0%, #020617 100%)",
        color: "#ffffff",
      }}
    >
      {/* Faint Altus Corp watermark (white variant for the dark footer) */}
      <img
        src="/altus-corp-logo-white.png?v=6"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ height: 240, width: "auto", opacity: 0.05 }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col items-center gap-3 px-6 py-10 text-center">
        {/* TOP — Ehara Engineering logo (circular, transparent, no tile) */}
        <img
          src="/logo-mark.png?v=6"
          alt="Ehara Engineering"
          style={{ height: 72, width: 72, display: "block", filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))" }}
        />

        {/* MIDDLE — Powered by */}
        <p
          className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(255, 255, 255, 0.5)" }}
        >
          Powered by
        </p>

        {/* BOTTOM — Altus Corp logo (white variant, transparent, no tile) */}
        <img src="/altus-corp-logo-white.png?v=6" alt="Altus Corp" style={{ height: 54, width: "auto", display: "block" }} />

        <p className="mt-2 text-xs" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          © Ehara Engineering 2025–2035 · All rights reserved
        </p>
      </div>
    </footer>
  );
}
