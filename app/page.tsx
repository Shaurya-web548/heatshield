"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import HeatBackground from "@/components/HeatBackground";
import { AuthModal } from "@/components/Response";
import { cities } from "@/data/cities";

const FEATURES = [
  {
    icon: "📐",
    title: "Localized Heat-Risk Index",
    text: "IMD temperature and humidity combined with satellite land-surface temperature, tree cover, built-up density and traffic — one explainable 0–100 score per ward.",
    href: "/dashboard?view=hri",
  },
  {
    icon: "🔥",
    title: "Hotspot Dashboard",
    text: "A live choropleth of every zone with a ranked hotspot table, the factors beneath each score, and the risk at any street you tap.",
    href: "/dashboard?view=hotspots",
  },
  {
    icon: "🔔",
    title: "Threshold-Based Alerts",
    text: "Zones crossing High or Critical alert the ward officer, health centre and traffic control — routed by role, de-duplicated, acknowledged.",
    href: "/dashboard?view=alerts",
  },
  {
    icon: "🛡️",
    title: "Response Tracking",
    text: "Authorities dispatch tankers, shade and ORS; every ticket is stamped officer-by-officer and residents see the status of relief in their own zone.",
    href: "/dashboard?view=response",
  },
];

export default function Landing() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [officer, setOfficer] = useState<string | null>(null);

  useEffect(() => {
    setOfficer(sessionStorage.getItem("heatshield-officer"));
  }, []);

  return (
    <main className="relative min-h-screen overflow-y-auto overflow-x-hidden bg-[#0b0a0f] text-neutral-100">
      <HeatBackground />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-10">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          🌡️ HeatShield
        </div>
        <nav className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
          <Link href="/dashboard?view=hri" className="rounded-lg px-2.5 py-1.5 text-neutral-300 hover:bg-white/10 sm:px-3">HRI</Link>
          <Link href="/dashboard?view=hotspots" className="rounded-lg px-2.5 py-1.5 text-neutral-300 hover:bg-white/10 sm:px-3">Dashboard</Link>
          <Link href="/dashboard?view=alerts" className="rounded-lg px-2.5 py-1.5 text-neutral-300 hover:bg-white/10 sm:px-3">Alerts</Link>
          {officer ? (
            <Link
              href="/dashboard?view=response"
              className="rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-200 hover:bg-amber-500/30"
            >
              🛡️ {officer}
            </Link>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="rounded-lg border border-amber-400/40 px-3 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/15"
            >
              🛡️ Authority login
            </button>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 pb-16 pt-10 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-orange-300"
        >
          Urban heat resilience · heat-risk identification &amp; response
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="heat-title mt-5 text-4xl font-bold leading-tight sm:text-6xl"
        >
          See the hotspots
          <br />
          <span className="text-orange-400">before they become incidents.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="mt-5 max-w-2xl text-sm leading-relaxed text-neutral-300 sm:text-base"
        >
          IMD says the city is 45 °C. A concrete market street with no trees and
          heavy traffic feels 50 °C. HeatShield turns the city bulletin into a
          ward-level Heat-Risk Index so municipal authorities can act on emerging
          hotspots — and so the street vendor, traffic constable and delivery
          rider know where relief is.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/dashboard?view=hotspots"
            className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-orange-900/40 transition hover:bg-orange-500"
          >
            🧑 Continue as resident / worker
          </Link>
          <button
            onClick={() => (officer ? router.push("/dashboard?view=response") : setAuthOpen(true))}
            className="rounded-xl border border-amber-400/50 bg-amber-500/15 px-6 py-3 text-sm font-semibold tracking-wide text-amber-200 transition hover:bg-amber-500/25"
          >
            🛡️ {officer ? "Open response console" : "Authority login"}
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-4 text-[11px] text-neutral-500"
        >
          Cities: {cities.map((c) => c.name).join(" · ")} · Simplified heat-index model · IMD snapshot data · representative zones
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-4 px-5 pb-20 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 * i }}
          >
            <Link
              href={f.href}
              className="group block h-full rounded-2xl border border-white/10 bg-black/50 p-5 backdrop-blur-md transition hover:border-orange-400/40 hover:bg-black/60"
            >
              <div className="text-2xl">{f.icon}</div>
              <div className="mt-2 text-base font-semibold text-neutral-100 group-hover:text-orange-200">
                {f.title}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{f.text}</p>
              <div className="mt-3 text-xs font-semibold text-orange-300 opacity-0 transition group-hover:opacity-100">
                Open →
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      <footer className="relative z-10 px-5 pb-8 text-center text-[11px] text-neutral-600">
        Decision-support prototype — alerts and dispatches are simulated. In a real
        emergency call 108 (ambulance) or 112.
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(id) => {
          sessionStorage.setItem("heatshield-officer", id);
          setOfficer(id);
          setAuthOpen(false);
          router.push("/dashboard?view=response");
        }}
      />
    </main>
  );
}
