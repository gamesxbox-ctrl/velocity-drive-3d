import { ELLIPSE_A, ELLIPSE_B } from "@/game/track";

export default function Minimap({ x = 0, z = 0 }) {
  const cx = 60 + (x / ELLIPSE_A) * 50;
  const cy = 52 + (z / ELLIPSE_B) * 38;
  return (
    <svg width="130" height="110" viewBox="0 0 120 104">
      <ellipse
        cx="60"
        cy="52"
        rx="50"
        ry="38"
        fill="rgba(0,0,0,0.35)"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <rect x="56" y="48" width="8" height="8" fill="#ffffff" opacity="0.8" rx="1" />
      <circle cx={cx} cy={cy} r="5" fill="#e63946" stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
}