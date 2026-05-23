import {
  AlertTriangle,
  Frown,
  Smile,
  Sparkles,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { type Motivations, MOTIVATIONS_PL, MOTIVATION_KEYS } from "../../lib/types";
import { Slider } from "@/components/ui/slider";

interface Props {
  value: Motivations;
  onChange: (next: Motivations) => void;
}

const ICONS: Record<keyof Motivations, LucideIcon> = {
  pain: Frown,
  pleasure: Smile,
  fear: AlertTriangle,
  hope: Sparkles,
  belonging: Users,
  rejection: XCircle,
};

export function MotivationBars({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {MOTIVATION_KEYS.map((key) => {
        const Icon = ICONS[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden />
            <div className="w-28 text-sm flex-shrink-0">{MOTIVATIONS_PL[key]}</div>
            <Slider
              className="flex-1"
              value={[value[key]]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => onChange({ ...value, [key]: v[0] ?? value[key] })}
              aria-label={`${MOTIVATIONS_PL[key]} — wartość ${value[key]}`}
            />
            <div className="w-8 text-sm tabular-nums text-right text-muted-foreground">
              {value[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
