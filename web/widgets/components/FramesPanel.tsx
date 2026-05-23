import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Frown,
  Loader2,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { FRAME_TYPE_LABELS_PL, type FramePayload, type FrameType } from "../../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  frames: FramePayload[];
  generating: FrameType | null;
  onGenerate: (type: FrameType) => void;
  onRemove: (frameId: string) => void;
}

const FRAME_TYPES: FrameType[] = ["aspirational", "pain", "social"];

const ICONS: Record<FrameType, LucideIcon> = {
  aspirational: Sparkles,
  pain: Frown,
  social: Users,
};

export function FramesPanel({ frames, generating, onGenerate, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {FRAME_TYPES.map((type) => {
          const Icon = ICONS[type];
          const inFlight = generating === type;
          return (
            <Button
              key={type}
              variant="outline"
              className="h-10 gap-1.5"
              onClick={() => onGenerate(type)}
              disabled={generating !== null}
              aria-label={`Wygeneruj ramkę ${FRAME_TYPE_LABELS_PL[type]}`}
            >
              {inFlight ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-xs">{FRAME_TYPE_LABELS_PL[type]}</span>
            </Button>
          );
        })}
      </div>

      {frames.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
          <Sparkles className="h-6 w-6 opacity-40" aria-hidden />
          <p className="text-xs text-center">
            Brak ramek. Kliknij jeden z przycisków powyżej, aby wygenerować.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {frames.map((frame) => (
            <FrameCard
              key={frame.frame_id}
              frame={frame}
              onRemove={() => onRemove(frame.frame_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FrameCard({ frame, onRemove }: { frame: FramePayload; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICONS[frame.frame_type];
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge variant="secondary" className="gap-1 font-normal">
              <Icon className="h-3 w-3" aria-hidden />
              {FRAME_TYPE_LABELS_PL[frame.frame_type]}
            </Badge>
            {frame.product_hook && (
              <span className="text-[10px] text-muted-foreground truncate">
                hook: {frame.product_hook}
              </span>
            )}
          </div>
          <p className={cn("text-sm leading-snug", !expanded && "line-clamp-2")}>
            {frame.text}
          </p>
          {expanded && frame.framework_note && (
            <p className="text-xs italic text-muted-foreground mt-1.5 leading-snug">
              {frame.framework_note}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Zwiń ramkę" : "Rozwiń ramkę"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Usuń ramkę z widoku"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
