import { type Motivations, MOTIVATIONS_PL, MOTIVATION_KEYS } from "../../lib/types";

interface Props {
  value: Motivations;
  onChange: (next: Motivations) => void;
}

/**
 * 6 horizontal bars — each 0–100 INDEPENDENT (not normalized).
 * Click anywhere on a bar to set its value; drag to refine.
 */
export function MotivationBars({ value, onChange }: Props) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">6 motywacji</div>
      <div className="flex flex-col gap-[3px]">
        {MOTIVATION_KEYS.map((key) => (
          <Bar
            key={key}
            label={MOTIVATIONS_PL[key]}
            value={value[key]}
            onChange={(next) => onChange({ ...value, [key]: next })}
          />
        ))}
      </div>
    </div>
  );
}

function Bar({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 100));
  };

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <div className="w-14 truncate text-foreground">{label}</div>
      <div
        className="relative flex-1 h-3 bg-muted rounded touch-none cursor-pointer"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePointer(e); }}
        onPointerMove={(e) => { if (e.buttons !== 0) handlePointer(e); }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      >
        <div
          className="absolute left-0 top-0 h-3 rounded bg-primary"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="w-7 text-right tabular-nums text-muted-foreground">{value}</div>
    </div>
  );
}
