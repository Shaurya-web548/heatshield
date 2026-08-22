"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive heat/fire background: a canvas of rising embers and heat
 * particles that drift toward the pointer, over slow-moving heat-haze
 * gradients (CSS). Pure client-side, no assets.
 */
export default function HeatBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const pointer = { x: w / 2, y: h * 0.6, active: false };

    type Ember = {
      x: number; y: number; r: number; vx: number; vy: number;
      life: number; max: number; hue: number;
    };
    const embers: Ember[] = [];
    const COUNT = Math.min(140, Math.floor((w * h) / 12000));

    const spawn = (): Ember => ({
      x: Math.random() * w,
      y: h + Math.random() * 40,
      r: 1 + Math.random() * 2.6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.4 + Math.random() * 1.1),
      life: 0,
      max: 300 + Math.random() * 400,
      hue: 15 + Math.random() * 35, // orange → amber
    });
    for (let i = 0; i < COUNT; i++) {
      const e = spawn();
      e.y = Math.random() * h;
      e.life = Math.random() * e.max;
      embers.push(e);
    }

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => (pointer.active = false);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const e of embers) {
        // gentle attraction toward the pointer — the "interactive" part
        if (pointer.active) {
          const dx = pointer.x - e.x;
          const dy = pointer.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 260) {
            e.vx += (dx / d) * 0.012;
            e.vy += (dy / d) * 0.008;
          }
        }
        e.vx *= 0.985;
        e.x += e.vx + Math.sin((e.life + e.y) * 0.02) * 0.3;
        e.y += e.vy;
        e.life++;
        const t = e.life / e.max;
        const alpha = t < 0.1 ? t * 10 : t > 0.8 ? (1 - t) * 5 : 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 100%, ${55 + e.r * 8}%, ${alpha * 0.85})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${e.hue}, 100%, 60%, ${alpha})`;
        ctx.fill();
        if (e.life > e.max || e.y < -20) Object.assign(e, spawn());
      }
      ctx.shadowBlur = 0;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    // Fixed to the viewport: the fire line stays at the bottom of the screen and
    // the embers keep drifting while the page scrolls (the canvas is only one
    // viewport tall).
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* heat haze gradients */}
      <div className="heat-blob heat-blob-1" />
      <div className="heat-blob heat-blob-2" />
      <div className="heat-blob heat-blob-3" />
      {/* ground fire glow */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-gradient-to-t from-orange-700/40 via-red-900/20 to-transparent" />
      <div className="fire-line" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* heat shimmer over everything */}
      <div className="heat-shimmer" />
    </div>
  );
}
