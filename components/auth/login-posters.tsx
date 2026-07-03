import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The login mosaic's tile library — a Canva-style wall of distinct "posters",
 * all on-brand for A A Tech. Hand-built SVG/CSS tiles that evoke the app
 * itself: Kanban boards, task lists, KPI cards, charts, attendance grids, and
 * the A A Tech brand mark. Pure markup (no external images, no third-party
 * marketing) so the wall is 100% A A Tech.
 *
 * `POSTER_TILES` is consumed by `login-mosaic.tsx`, which distributes them into
 * drifting columns. Each entry carries a base `h` (px) so the columns build a
 * varied masonry rhythm.
 */

const BLUE_PRIMARY = "#0180cf";
const BLUE_DEEP = "#0069b3";
const GREEN_BRAND = "#63b81e";
const INK = "#0a0a0a";
const PAPER = "#F4F7FA";
const GREEN = "#16A34A";
const AMBER = "#F59E0B";
const BLUE = "#3B82F6";

const DISPLAY = "var(--font-display), Georgia, serif";
const SANS = "var(--font-sans), system-ui, sans-serif";
const MONO = "var(--font-mono-display), ui-monospace, monospace";

function Tile({
  h,
  bg,
  children,
  pad = 18,
}: {
  h: number;
  bg: string;
  children: ReactNode;
  pad?: number;
}) {
  return (
    <div
      style={{
        height: h,
        background: bg,
        borderRadius: 14,
        padding: pad,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 10px 30px -14px rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  );
}

/** The A A Tech logo mark (transparent PNG), sized to taste. */
function Mark({ size = 40, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{
        objectFit: "contain",
        filter: glow ? "drop-shadow(0 4px 14px rgba(1,128,207,0.45))" : undefined,
      }}
    />
  );
}

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.04em",
        background: `color-mix(in srgb, ${tone} 16%, transparent)`,
        color: tone,
        fontFamily: SANS,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: tone }} />
      {children}
    </span>
  );
}

// ── A A Tech brand / slogan posters ──────────────────────────────────────

function SloganOrganize() {
  return (
    <Tile h={300} bg={`linear-gradient(160deg, ${GREEN_BRAND}, ${BLUE_DEEP})`}>
      <Mark size={46} />
      <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 900, color: "#fff", fontSize: 30, lineHeight: 1.02, letterSpacing: "-0.02em" }}>
        ORGANIZE.
        <br />
        TRACK.
        <br />
        DELIVER.
      </div>
      <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(255,255,255,0.6)" }}>
        WORK · MANAGEMENT
      </div>
    </Tile>
  );
}

function SloganAccountable() {
  return (
    <Tile h={230} bg="linear-gradient(160deg,#101820,#0a0a0a)">
      <div style={{ fontFamily: DISPLAY, fontStyle: "italic", color: "#fff", fontSize: 30, lineHeight: 1.05 }}>
        Every task,<br />accountable.
      </div>
      <div style={{ marginTop: 12, height: 3, width: 54, background: BLUE_PRIMARY, borderRadius: 2 }} />
      <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>
        Clear owners. Clear status. Nothing slips.
      </div>
    </Tile>
  );
}

function BrandTagline() {
  return (
    <Tile h={210} bg={PAPER}>
      <div style={{ fontFamily: SANS, fontWeight: 900, color: INK, fontSize: 28, lineHeight: 1.0, letterSpacing: "-0.02em" }}>
        ONE TEAM.
        <br />
        <span style={{ color: BLUE_PRIMARY }}>ONE BOARD.</span>
      </div>
      <div style={{ marginTop: 16, fontFamily: SANS, fontSize: 12, color: "#5b6b78", fontWeight: 600 }}>
        Tasks, attendance &amp; collections in one place.
      </div>
    </Tile>
  );
}

function StatGrowth() {
  return (
    <Tile h={200} bg={`linear-gradient(150deg, ${GREEN_BRAND}, ${BLUE_DEEP})`}>
      <div style={{ fontFamily: SANS, fontWeight: 900, color: "#fff", fontSize: 64, lineHeight: 0.9, letterSpacing: "-0.04em" }}>100%</div>
      <div style={{ marginTop: 6, fontFamily: SANS, fontWeight: 800, color: "rgba(255,255,255,0.9)", fontSize: 14 }}>visibility on every task</div>
    </Tile>
  );
}

// ── App-UI mockup tiles ──────────────────────────────────────────────────

function KanbanMock() {
  const cols: [string, string, number][] = [
    ["TO DO", "#64748b", 3],
    ["DOING", AMBER, 2],
    ["DONE", GREEN, 2],
  ];
  return (
    <Tile h={250} bg="#101820" pad={14}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>KANBAN</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {cols.map(([label, tone, n]) => (
          <div key={label} style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 800, color: tone, letterSpacing: "0.06em" }}>{label}</div>
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} style={{ height: 30, borderRadius: 6, background: "rgba(255,255,255,0.06)", borderLeft: `3px solid ${tone}`, padding: "5px 6px" }}>
                <div style={{ height: 4, width: "78%", borderRadius: 3, background: "rgba(255,255,255,0.22)" }} />
                <div style={{ height: 4, width: "50%", borderRadius: 3, background: "rgba(255,255,255,0.12)", marginTop: 4 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Tile>
  );
}

function TaskListMock() {
  const rows: [string, string, string][] = [
    ["AS", GREEN, "Done"],
    ["SD", AMBER, "Pending"],
    ["HV", BLUE_PRIMARY, "Critical"],
    ["DK", BLUE, "Review"],
  ];
  return (
    <Tile h={235} bg={PAPER} pad={14}>
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 900, color: INK, marginBottom: 10, letterSpacing: "0.02em" }}>TASKS · TODAY</div>
      <div style={{ display: "grid", gap: 9 }}>
        {rows.map(([ini, tone, label], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, background: INK, color: "#fff", fontFamily: SANS, fontSize: 9.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{ini}</span>
            <span style={{ flex: 1, display: "grid", gap: 4 }}>
              <span style={{ height: 5, width: "70%", borderRadius: 3, background: "#cdd6de" }} />
              <span style={{ height: 4, width: "44%", borderRadius: 3, background: "#dde4ea" }} />
            </span>
            <Pill tone={tone}>{label}</Pill>
          </div>
        ))}
      </div>
    </Tile>
  );
}

function KpiCluster() {
  const kpis: [string, string, string][] = [
    ["286", "PENDING", AMBER],
    ["77", "DONE", GREEN],
    ["60", "CRITICAL", BLUE_PRIMARY],
    ["15", "URGENT", "#f97316"],
  ];
  return (
    <Tile h={210} bg="#0d1116" pad={14}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {kpis.map(([n, l, tone]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: "10px 11px", borderTop: `3px solid ${tone}` }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, color: "#fff", fontSize: 26, lineHeight: 1, letterSpacing: "-0.03em" }}>{n}</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.14em", color: tone, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </Tile>
  );
}

function DonutTile() {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <Tile h={210} bg={PAPER} pad={16}>
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 900, color: INK, marginBottom: 8 }}>ON TRACK</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={92} height={92} viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={r} fill="none" stroke="#dde6ec" strokeWidth="13" />
          <circle cx="46" cy="46" r={r} fill="none" stroke={BLUE_PRIMARY} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${c * 0.72} ${c}`} transform="rotate(-90 46 46)" />
          <text x="46" y="51" textAnchor="middle" fontFamily={SANS} fontWeight="900" fontSize="19" fill={INK}>72%</text>
        </svg>
        <div style={{ display: "grid", gap: 8 }}>
          <Pill tone={BLUE_PRIMARY}>On track</Pill>
          <Pill tone={AMBER}>At risk</Pill>
          <Pill tone={GREEN}>Approved</Pill>
        </div>
      </div>
    </Tile>
  );
}

function BarsTile() {
  const bars = [40, 62, 48, 80, 58, 92, 70];
  return (
    <Tile h={200} bg="linear-gradient(160deg,#101820,#0a0a0a)" pad={14}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>WEEKLY VELOCITY</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 110 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, height: `${b}%`, borderRadius: "4px 4px 0 0", background: i === 5 ? BLUE_PRIMARY : "rgba(99,184,30,0.55)" }} />
        ))}
      </div>
    </Tile>
  );
}

function AttendanceTile() {
  return (
    <Tile h={235} bg={PAPER} pad={14}>
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 900, color: INK, marginBottom: 10 }}>ATTENDANCE</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
        {Array.from({ length: 28 }).map((_, i) => {
          const on = i % 6 !== 4 && i % 7 !== 6;
          return <span key={i} style={{ aspectRatio: "1", borderRadius: 4, background: on ? "color-mix(in srgb, #16A34A 80%, white)" : "#dde6ec" }} />;
        })}
      </div>
      <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 11.5, color: "#3f4a52", fontWeight: 700 }}>
        Checked in <span style={{ color: GREEN }}>10:34 am</span>
      </div>
    </Tile>
  );
}

function WordmarkTile() {
  return (
    <Tile h={150} bg={PAPER}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: "100%" }}>
        <Mark size={38} glow={false} />
        <div style={{ fontFamily: MONO, fontWeight: 800, color: INK, fontSize: 17, letterSpacing: "0.16em" }}>A A<br />TECH</div>
      </div>
    </Tile>
  );
}

function BrandMarkTile() {
  return (
    <Tile h={190} bg="radial-gradient(120% 90% at 50% 20%, #10202c, #0a0a0a)">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Mark size={92} />
      </div>
    </Tile>
  );
}

export interface PosterTile {
  id: string;
  el: ReactNode;
}

/** The full deck, deliberately ordered so neighbours differ in tone + type. */
export const POSTER_TILES: PosterTile[] = [
  { id: "brandmark", el: <BrandMarkTile /> },
  { id: "kanban", el: <KanbanMock /> },
  { id: "organize", el: <SloganOrganize /> },
  { id: "tasks", el: <TaskListMock /> },
  { id: "kpi", el: <KpiCluster /> },
  { id: "donut", el: <DonutTile /> },
  { id: "wordmark", el: <WordmarkTile /> },
  { id: "bars", el: <BarsTile /> },
  { id: "accountable", el: <SloganAccountable /> },
  { id: "attendance", el: <AttendanceTile /> },
  { id: "tagline", el: <BrandTagline /> },
  { id: "growth", el: <StatGrowth /> },
  { id: "kanban2", el: <KanbanMock /> },
  { id: "kpi2", el: <KpiCluster /> },
  { id: "donut2", el: <DonutTile /> },
  { id: "tasks2", el: <TaskListMock /> },
  { id: "brandmark2", el: <BrandMarkTile /> },
  { id: "attendance2", el: <AttendanceTile /> },
];
