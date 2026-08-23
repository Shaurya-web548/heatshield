"use client";

import { motion, AnimatePresence } from "framer-motion";

export function WarningBanners({ banners }: { banners: string[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-6 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {banners.map((text) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={`max-w-[92vw] rounded-xl border px-4 py-2 text-center text-xs font-medium shadow-2xl backdrop-blur-md sm:px-5 sm:py-2.5 sm:text-sm ${
              text.startsWith("🔥") || text.startsWith("⏫")
                ? "border-red-500/40 bg-red-950/85 text-red-100"
                : text.startsWith("⚠")
                  ? "border-orange-500/40 bg-orange-950/85 text-orange-100"
                  : "border-amber-500/40 bg-amber-950/85 text-amber-100"
            }`}
          >
            {text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
