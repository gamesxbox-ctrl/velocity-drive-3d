import { Flag } from "lucide-react";

export function formatRaceTime(ms) {
  const mm = String(Math.floor(ms / 60000)).padStart(2, "0");
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  const cs = String(Math.floor(ms / 10) % 100).padStart(3, "0");
  return `${mm}:${ss}.${cs}`;
}

export default function RaceStats({ time = 0, lap = 1, totalLaps = 3 }) {
  const shadow = "0 2px 3px rgba(0,0,0,0.9)";
  return (
    <div className="absolute top-4 right-4 text-right">
      <div className="text-3xl font-bold text-white tabular-nums" style={{ textShadow: shadow }}>
        {formatRaceTime(time)}
      </div>
      <div
        className="flex items-center justify-end gap-1.5 mt-1 text-xl font-bold text-white"
        style={{ textShadow: shadow }}
      >
        <Flag className="w-5 h-5" />
        {lap}/{totalLaps}
      </div>
    </div>
  );
}