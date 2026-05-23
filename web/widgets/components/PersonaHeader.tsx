import { useState } from "react";
import { Check, Download, Pencil } from "lucide-react";
import type { PersonaPayload } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  persona: PersonaPayload;
  onPatch: (patch: Partial<PersonaPayload>) => void;
  onExportMd: () => void;
  onExportJson: () => void;
}

export function PersonaHeader({ persona, onPatch, onExportMd, onExportJson }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
      {editing ? (
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input
              className="h-8 text-sm"
              value={persona.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="Imię"
            />
            <Input
              className="h-8 w-16 text-sm"
              type="number"
              min={13}
              max={99}
              value={persona.age}
              onChange={(e) => onPatch({ age: Number(e.target.value) })}
            />
          </div>
          <div className="flex gap-1.5">
            <Input
              className="h-8 text-xs flex-1"
              value={persona.profession}
              onChange={(e) => onPatch({ profession: e.target.value })}
              placeholder="Profesja"
            />
            <Input
              className="h-8 text-xs w-28"
              value={persona.location}
              onChange={(e) => onPatch({ location: e.target.value })}
              placeholder="Lokalizacja"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold leading-tight truncate">
            {persona.name}, {persona.age}
          </h2>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            {persona.profession} · {persona.location}
          </p>
        </div>
      )}

      <div className="flex gap-1 flex-shrink-0">
        {editing ? (
          <Button
            variant="default"
            size="sm"
            className="h-9 px-2"
            onClick={() => setEditing(false)}
            aria-label="Zapisz zmiany"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setEditing(true)}
              aria-label="Edytuj imię, profesję i lokalizację"
              title="Edytuj"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 gap-1"
              onClick={onExportMd}
              aria-label="Pobierz personę jako Markdown"
              title="Eksport MD"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">MD</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 gap-1"
              onClick={onExportJson}
              aria-label="Pobierz personę jako JSON"
              title="Eksport JSON"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">JSON</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
