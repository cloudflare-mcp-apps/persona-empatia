import { useState } from "react";
import type { PersonaPayload } from "../../lib/types";

interface Props {
  persona: PersonaPayload;
  onPatch: (patch: Partial<PersonaPayload>) => void;
  onExportMd: () => void;
  onExportJson: () => void;
}

export function PersonaHeader({ persona, onPatch, onExportMd, onExportJson }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-col gap-1 p-2 border-b border-border">
        <div className="flex gap-1.5">
          <input
            className="flex-1 text-[12px] px-2 py-1 rounded border border-border bg-background"
            value={persona.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="Imię"
          />
          <input
            className="w-14 text-[12px] px-2 py-1 rounded border border-border bg-background"
            type="number"
            min={13}
            max={99}
            value={persona.age}
            onChange={(e) => onPatch({ age: Number(e.target.value) })}
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[11px] px-2 rounded border border-border hover:bg-muted h-7"
          >
            ✓
          </button>
        </div>
        <div className="flex gap-1.5">
          <input
            className="flex-1 text-[11px] px-2 py-1 rounded border border-border bg-background"
            value={persona.profession}
            onChange={(e) => onPatch({ profession: e.target.value })}
            placeholder="Profesja"
          />
          <input
            className="w-24 text-[11px] px-2 py-1 rounded border border-border bg-background"
            value={persona.location}
            onChange={(e) => onPatch({ location: e.target.value })}
            placeholder="Lokalizacja"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 border-b border-border">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold leading-tight truncate">
          {persona.name}, {persona.age}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {persona.profession} · {persona.location}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[10px] px-2 rounded border border-border hover:bg-muted h-7"
          title="Edytuj imię/profesję/lokalizację"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={onExportMd}
          className="text-[10px] px-2 rounded border border-border hover:bg-muted h-7"
          title="Eksportuj jako Markdown"
        >
          ⬇ md
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="text-[10px] px-2 rounded border border-border hover:bg-muted h-7"
          title="Eksportuj jako JSON"
        >
          ⬇ json
        </button>
      </div>
    </div>
  );
}
