import { MASLOW_TIERS_PL, type MaslowLevel } from "../../lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Props {
  level: MaslowLevel;
  onChange: (level: MaslowLevel) => void;
}

const TIERS: MaslowLevel[] = [5, 4, 3, 2, 1];

const TIER_WIDTHS: Record<MaslowLevel, string> = {
  5: "44%",
  4: "58%",
  3: "72%",
  2: "86%",
  1: "100%",
};

export function MaslowPyramid({ level, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={String(level)}
      onValueChange={(v) => {
        if (!v) return;
        const next = Number(v) as MaslowLevel;
        if (next >= 1 && next <= 5) onChange(next);
      }}
      className="flex flex-col items-center w-full gap-1"
      aria-label="Poziom potrzeb Maslowa"
    >
      {TIERS.map((tier) => (
        <ToggleGroupItem
          key={tier}
          value={String(tier)}
          className="h-9 justify-start gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          style={{ width: TIER_WIDTHS[tier] }}
          aria-label={`Poziom ${tier}: ${MASLOW_TIERS_PL[tier - 1]}`}
        >
          <span className="font-mono tabular-nums text-xs w-3 text-center opacity-70">
            {tier}
          </span>
          <span className="text-xs truncate">{MASLOW_TIERS_PL[tier - 1]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
