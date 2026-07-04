export function DashboardFooter() {
  return (
    <footer
      className="relative mt-16 border-t border-white/10"
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        color: "#ffffff",
      }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-4 px-6 py-6 md:flex-row md:justify-between">
        {/* LEFT — Ehara Engineering mark + name */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-mark.png?v=6"
            alt="Ehara Engineering"
            style={{ height: 34, width: 34, display: "block" }}
          />
          <span className="text-[13.5px] font-black tracking-tight text-white/90">
            Ehara Engineering
          </span>
        </div>

        {/* CENTER — copyright (drops to the bottom on mobile) */}
        <p className="order-last text-[12px] text-white/45 md:order-none">
          © Ehara Engineering 2025–2035 · All rights reserved
        </p>

        {/* RIGHT — powered by Altus Corp */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
            Powered by
          </span>
          <img
            src="/altus-corp-logo-white.png?v=6"
            alt="Altus Corp"
            style={{ height: 26, width: "auto", display: "block" }}
          />
        </div>
      </div>
    </footer>
  );
}
