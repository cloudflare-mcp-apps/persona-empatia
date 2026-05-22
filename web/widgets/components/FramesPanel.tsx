import { useState } from "react";
import { FRAME_TYPE_LABELS_PL, type FramePayload, type FrameType } from "../../lib/types";

interface Props {
  frames: FramePayload[];
  generating: FrameType | null;
  onGenerate: (type: FrameType) => void;
  onRemove: (frameId: string) => void;
}

const FRAME_TYPES: FrameType[] = ["aspirational", "pain", "social"];

export function FramesPanel({ frames, generating, onGenerate, onRemove }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ramki copywriterskie</div>
        <div className="flex gap-1">
          {FRAME_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onGenerate(type)}
              disabled={generating !== null}
              className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted disabled:opacity-50 h-6"
              title={`Wygeneruj ramkę ${FRAME_TYPE_LABELS_PL[type]}`}
            >
              {generating === type ? "..." : `+ ${FRAME_TYPE_LABELS_PL[type].toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5">
        {frames.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-4">
            Brak ramek. Kliknij „+ aspir." / „+ ból" / „+ społ.", aby wygenerować.
          </div>
        )}
        {frames.map((frame) => (
          <FrameCard key={frame.frame_id} frame={frame} onRemove={() => onRemove(frame.frame_id)} />
        ))}
      </div>
    </div>
  );
}

function FrameCard({ frame, onRemove }: { frame: FramePayload; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const label = FRAME_TYPE_LABELS_PL[frame.frame_type];
  return (
    <div className="rounded border border-border p-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{label}</span>
            {frame.product_hook && (
              <span className="text-[9px] text-muted-foreground truncate">hook: {frame.product_hook}</span>
            )}
          </div>
          <div className={`text-[11px] leading-snug ${expanded ? "" : "line-clamp-2"}`}>{frame.text}</div>
          {expanded && frame.framework_note && (
            <div className="text-[10px] italic text-muted-foreground mt-1">{frame.framework_note}</div>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] px-1 h-5 rounded hover:bg-muted"
            title={expanded ? "Zwiń" : "Rozwiń"}
          >
            {expanded ? "▲" : "▼"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] px-1 h-5 rounded hover:bg-muted text-destructive"
            title="Usuń ramkę z widoku"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
