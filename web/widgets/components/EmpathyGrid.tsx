import { type EmpathyMap, EMPATHY_LABELS_PL, EMPATHY_KEYS } from "../../lib/types";

interface Props {
  value: EmpathyMap;
  onChange: (next: EmpathyMap) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

/**
 * 5-quadrant empathy map (sees / hears / feels / says / does).
 * Single 🔄 button regenerates ALL 5 jointly for coherence (rule: framework_note
 * mentions Maslow + 3F dominance, so individual regen would create inconsistencies).
 */
export function EmpathyGrid({ value, onChange, onRegenerate, regenerating }: Props) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Mapa empatii</div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted disabled:opacity-50 h-6"
          title="Regeneruj wszystkie 5 pól jednocześnie"
        >
          {regenerating ? "..." : "🔄 regeneruj"}
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {EMPATHY_KEYS.map((k) => (
          <div key={k} className="flex flex-col">
            <label className="text-[9px] uppercase text-muted-foreground mb-0.5">{EMPATHY_LABELS_PL[k]}</label>
            <textarea
              value={value[k]}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
              className={`text-[11px] leading-tight p-1 rounded border border-border bg-background resize-none h-12 transition-opacity ${regenerating ? "opacity-50" : ""}`}
              maxLength={280}
              placeholder={EMPATHY_LABELS_PL[k]}
              disabled={regenerating}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
