import { useEffect, useState } from "react";

/**
 * PlateRing — elemen signature halaman ini.
 * Cincin ganda meniru tepi piring keramik; terisi mengikuti
 * persentase kalori yang sudah dikonsumsi hari ini.
 */
export default function PlateRing({ consumed, target, size = 220 }) {
  const radius = size / 2 - 18;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const overTarget = consumed > target && target > 0;

  const [animatedPct, setAnimatedPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  const offset = circumference * (1 - animatedPct);
  const ringColor = overTarget ? "var(--sambal)" : "var(--turmeric)";

  return (
    <div className="plate-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* tepi piring luar (dekoratif, ganda) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1.5"
        />
        {/* alas track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth="14"
        />
        {/* isi progres */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1), stroke 0.4s" }}
        />
      </svg>
      <div className="plate-ring__center">
        <span className="plate-ring__value">{Math.round(consumed)}</span>
        <span className="plate-ring__unit">dari {Math.round(target)} kkal</span>
      </div>
    </div>
  );
}
