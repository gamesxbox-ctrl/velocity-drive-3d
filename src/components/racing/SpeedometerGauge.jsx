export default function SpeedometerGauge({ speed = 0, max = 120 }) {
  const R = 48;
  const C = 2 * Math.PI * R;
  const ARC = 0.75 * C;
  const pct = Math.max(0, Math.min(1, speed / max));

  return (
    <svg width="130" height="130" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#ff7a00" />
        </linearGradient>
      </defs>
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="rgba(20,20,20,0.55)"
        stroke="#2e2e2e"
        strokeWidth="10"
        strokeDasharray={`${ARC} ${C}`}
        strokeLinecap="round"
        transform="rotate(135 60 60)"
      />
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke="url(#speedGrad)"
        strokeWidth="10"
        strokeDasharray={`${ARC * pct} ${C}`}
        strokeLinecap="round"
        transform="rotate(135 60 60)"
      />
      <text x="60" y="64" textAnchor="middle" fill="#ffffff" fontSize="30" fontWeight="700">
        {Math.round(speed)}
      </text>
      <text x="60" y="84" textAnchor="middle" fill="#bcbcbc" fontSize="11" fontWeight="600">
        km/h
      </text>
    </svg>
  );
}