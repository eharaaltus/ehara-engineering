import type { ReactNode } from "react";

/**
 * The login mosaic's tile library — the real Ehara Engineering marketing
 * posters, tiled into a drifting "poster wall" behind the sign-in card
 * (matching the reference login). Images live in /public/login-posters/.
 * Decorative only; the wall is dimmed by `login-mosaic.tsx`.
 */

const POSTERS = [
  "poster-01.jpg", "poster-02.jpg", "poster-03.jpg", "poster-04.jpg",
  "poster-05.jpg", "poster-06.jpg", "poster-07.jpg", "poster-08.jpg",
  "poster-09.jpg", "poster-10.jpg", "poster-11.jpg", "poster-12.jpg",
  "poster-13.jpg",
];

function PosterImg({ src }: { src: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 12px 34px -16px rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "#0d1220",
      }}
    >
      {/* Plain <img> (not next/image) — decorative, lazy, fills its column. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/login-posters/${src}`}
        alt=""
        aria-hidden
        loading="lazy"
        draggable={false}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}

export interface PosterTile {
  id: string;
  el: ReactNode;
}

// Two interleaved passes so each column mixes different posters and the wall
// never visibly repeats side-by-side. Deterministic order (SSR-stable).
export const POSTER_TILES: PosterTile[] = [
  ...POSTERS.map((src, i) => ({ id: `p-${i}`, el: <PosterImg src={src} /> })),
  ...POSTERS.map((src, i) => ({ id: `q-${i}`, el: <PosterImg src={POSTERS[(i + 5) % POSTERS.length]!} /> })),
];
