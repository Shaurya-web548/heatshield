"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, animate, useReducedMotion } from "framer-motion";

/** Quick, restrained motion tokens shared across the dashboard. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const FAST = { duration: 0.25, ease: EASE };
export const BASE = { duration: 0.4, ease: EASE };

/** Staggered entrance wrapper for panels. */
export function Enter({
  children,
  delay = 0,
  from = "up",
  className,
}: {
  children: ReactNode;
  delay?: number;
  from?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const offset = { up: { y: 14 }, down: { y: -14 }, left: { x: 14 }, right: { x: -14 } }[from];
  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...BASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade-in of section contents keyed by `id`. Deliberately no exit animation:
 * the new section mounts immediately and eases in, so switching never waits
 * on an animation frame (e.g. in a background tab).
 */
export function Switch({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={FAST}
    >
      {children}
    </motion.div>
  );
}

/** Number that counts to its value; re-counts from the previous value on change. */
export function CountUp({
  value,
  decimals = 0,
  duration = 0.6,
  className,
  style,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(shown, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return (
    <span className={className} style={style}>
      {shown.toFixed(decimals)}
    </span>
  );
}

/** Horizontal bar that grows to `pct` (0–100). */
export function GrowBar({
  pct,
  color,
  height = 6,
  delay = 0,
  className,
}: {
  pct: number;
  color: string;
  height?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <span
      className={`block w-full overflow-hidden rounded bg-white/10 ${className ?? ""}`}
      style={{ height }}
    >
      <motion.span
        className="block h-full rounded"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.6, ease: EASE, delay }}
      />
    </span>
  );
}

/** Pressable wrapper: lift on hover, compress on tap. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985 },
  transition: { duration: 0.15 },
};
