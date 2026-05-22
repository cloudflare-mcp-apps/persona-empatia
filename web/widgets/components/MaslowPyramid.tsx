import { MASLOW_TIERS_PL, type MaslowLevel } from "../../lib/types";

interface Props {
  level: MaslowLevel;
  onChange: (level: MaslowLevel) => void;
}

/**
 * SVG 5-tier Maslow pyramid. Click any tier to set the active level.
 * Levels: 1 (bottom = fizjologiczne) → 5 (top = samorealizacja).
 */
export function MaslowPyramid({ level, onChange }: Props) {
  // Each tier is a trapezoid; pyramid is drawn top-down so the active level reads visually.
  const width = 110;
  const height = 110;
  const baseWidth = width - 8;
  const peakWidth = 24;
  const tierHeight = (height - 4) / 5;

  // Display tiers top-to-bottom (level 5 first).
  const tiers: MaslowLevel[] = [5, 4, 3, 2, 1];

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Maslow</div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="touch-manipulation">
        {tiers.map((tier, idx) => {
          const topRatio = idx / 5;
          const bottomRatio = (idx + 1) / 5;
          const tw = peakWidth + (baseWidth - peakWidth) * topRatio;
          const bw = peakWidth + (baseWidth - peakWidth) * bottomRatio;
          const cx = width / 2;
          const y0 = 2 + idx * tierHeight;
          const y1 = y0 + tierHeight;
          const points = `${cx - tw / 2},${y0} ${cx + tw / 2},${y0} ${cx + bw / 2},${y1} ${cx - bw / 2},${y1}`;
          const active = tier === level;
          return (
            <g key={tier} onClick={() => onChange(tier)} style={{ cursor: "pointer" }}>
              <polygon
                points={points}
                fill={active ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <text
                x={cx}
                y={y0 + tierHeight / 2 + 3}
                fontSize={8}
                textAnchor="middle"
                fill={active ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {tier}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] text-center text-muted-foreground mt-1 leading-tight">
        {MASLOW_TIERS_PL[level - 1]}
      </div>
    </div>
  );
}
