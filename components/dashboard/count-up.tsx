"use client";

import * as React from "react";

/**
 * Animate a number from 0 → target with an easeOutCubic curve. Used by the
 * dashboard hero and KPI widgets so figures "count up" on load — a small but
 * high-signal premium touch. Respects prefers-reduced-motion (snaps instantly).
 */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    let startTs = 0;
    const tick = (now: number) => {
      if (!startTs) startTs = now;
      const p = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function Counter({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const v = useCountUp(value);
  return (
    <span className={className} style={style}>
      {v.toLocaleString()}
    </span>
  );
}
