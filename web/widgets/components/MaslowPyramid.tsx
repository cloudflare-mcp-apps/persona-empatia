import { MASLOW_TIERS_PL, type MaslowLevel } from "../../lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Props {
  level: MaslowLevel;
  onChange: (level: MaslowLevel) => void;
}

const TIERS: MaslowLevel[] = [5, 4, 3, 2, 1];

export function MaslowPyramid({ level, onChange }: Props) {
  const width = 180;
  const height = 160;
  const baseWidth = width - 16;
  const peakWidth = 36;
  const tierHeight = (height - 8) / 5;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="touch-manipulation"
        role="img"
        aria-label={`Piramida potrzeb Maslowa — poziom ${level}: ${MASLOW_TIERS_PL[level - 1]}`}
      >
        {TIERS.map((tier, idx) => {
          const topRatio = idx / 5;
          const bottomRatio = (idx + 1) / 5;
          const tw = peakWidth + (baseWidth - peakWidth) * topRatio;
          const bw = peakWidth + (baseWidth - peakWidth) * bottomRatio;
          const cx = width / 2;
          const y0 = 4 + idx * tierHeight;
          const y1 = y0 + tierHeight;
          const points = `${cx - tw / 2},${y0} ${cx + tw / 2},${y0} ${cx + bw / 2},${y1} ${cx - bw / 2},${y1}`;
          const active = tier === level;
          return (
            <g key={tier} onClick={() => onChange(tier)} style={{ cursor: "pointer" }}>
              <title>{`Poziom ${tier}: ${MASLOW_TIERS_PL[tier - 1]}`}</title>
              <polygon
                points={points}
                fill={active ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <text
                x={cx}
                y={y0 + tierHeight / 2 + 4}
                fontSize={12}
                fontWeight={active ? 600 : 400}
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

      <ToggleGroup
        type="single"
        value={String(level)}
        onValueChange={(v) => {
          if (!v) return;
          const next = Number(v) as MaslowLevel;
          if (next >= 1 && next <= 5) onChange(next);
        }}
        className="gap-1"
        aria-label="Wybierz poziom Maslowa"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <ToggleGroupItem
            key={n}
            value={String(n)}
            className="h-10 w-10 text-sm"
            aria-label={`Poziom ${n}: ${MASLOW_TIERS_PL[n - 1]}`}
          >
            {n}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <p className="text-xs text-muted-foreground text-center">
        {MASLOW_TIERS_PL[level - 1]}
      </p>
    </div>
  );
}
