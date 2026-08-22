"use client";

import { useEffect, useState } from "react";

/** Open by default on desktop; starts collapsed on small screens. */
export function useDefaultCollapsedOnMobile(): [boolean, () => void] {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }, []);
  return [open, () => setOpen((v) => !v)];
}
