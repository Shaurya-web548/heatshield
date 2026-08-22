"use client";

import { DAY_START, DAY_END, formatHour } from "@/lib/heat";

export type PlayState = "idle" | "playing" | "done";

export default function ControlBar({
  hour,
  playState,
  whatIfOpen,
  whatIfActive,
  onScrub,
  onPlay,
  onToggleWhatIf,
}: {
  hour: number;
  playState: PlayState;
  whatIfOpen: boolean;
  whatIfActive: boolean;
  onScrub: (hour: number) => void;
  onPlay: () => void;
  onToggleWhatIf: () => void;
}) {
  return (
    <div className="absolute bottom-3 left-1/2 z-[1000] flex w-[calc(100vw-1rem)] max-w-fit -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-white/10 bg-black/70 px-3 py-2.5 shadow-2xl backdrop-blur-md sm:bottom-5 sm:gap-5 sm:px-6 sm:py-4">
      <button
        onClick={onPlay}
        className="flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-orange-600 px-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-orange-500 active:bg-orange-700 sm:h-12 sm:min-w-[7.5rem] sm:px-5 sm:text-base"
      >
        {playState === "playing" ? (
          <>❚❚<span className="hidden sm:inline"> PAUSE</span></>
        ) : playState === "done" ? (
          <>↺<span className="hidden sm:inline"> REPLAY</span></>
        ) : (
          <>▶<span className="hidden sm:inline"> PLAY DAY</span></>
        )}
      </button>

      <input
        type="range"
        min={DAY_START}
        max={DAY_END}
        step={0.1}
        value={hour}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Time of day"
        className="h-2 w-full min-w-24 cursor-pointer accent-orange-500 sm:w-72"
      />

      <div className="shrink-0 text-right sm:w-24">
        <span className="font-mono text-xl font-bold tabular-nums text-orange-400 sm:text-3xl">
          {formatHour(hour)}
        </span>
      </div>

      <button
        onClick={onToggleWhatIf}
        title="What-if planning"
        className={`relative h-9 shrink-0 rounded-xl border px-2.5 text-xs font-semibold tracking-wide transition-colors sm:h-10 sm:px-3 ${
          whatIfOpen
            ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
            : "border-white/15 text-neutral-300 hover:bg-white/10"
        }`}
      >
        ⚗️<span className="hidden sm:inline"> What-if</span>
        {whatIfActive && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
        )}
      </button>
    </div>
  );
}
