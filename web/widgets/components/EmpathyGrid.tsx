import { Ear, Eye, Footprints, Heart, MessageCircle, RefreshCw, type LucideIcon } from "lucide-react";
import { type EmpathyMap, EMPATHY_LABELS_PL, EMPATHY_KEYS } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  value: EmpathyMap;
  onChange: (next: EmpathyMap) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

const ICONS: Record<keyof EmpathyMap, LucideIcon> = {
  sees: Eye,
  hears: Ear,
  feels: Heart,
  says: MessageCircle,
  does: Footprints,
};

export function EmpathyGrid({ value, onChange, onRegenerate, regenerating }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-label="Regeneruj mapę empatii"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
          <span className="text-xs">Regeneruj</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {EMPATHY_KEYS.map((k) => {
          const Icon = ICONS[k];
          return (
            <div key={k} className="flex flex-col gap-1 rounded-md border bg-card p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span>{EMPATHY_LABELS_PL[k]}</span>
              </div>
              <Textarea
                value={value[k]}
                onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                className={cn(
                  "text-xs leading-snug resize-none min-h-[64px]",
                  regenerating && "opacity-50",
                )}
                maxLength={280}
                placeholder={EMPATHY_LABELS_PL[k]}
                disabled={regenerating}
                rows={3}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
