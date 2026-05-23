import { useEffect, useState } from "react";
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

const NAME_MAX = 40;
const PROF_MAX = 80;
const LOC_MAX = 80;
const AGE_MIN = 13;
const AGE_MAX = 99;

export function PersonaHeader({ persona, onPatch, onExportMd, onExportJson }: Props) {
  const [editing, setEditing] = useState(false);
  // Local draft state for inputs that need validation gating — avoids sending
  // intermediate invalid values to the server (e.g. age="2" en route to "25").
  const [draftAge, setDraftAge] = useState(String(persona.age));
  const [draftName, setDraftName] = useState(persona.name);

  useEffect(() => {
    setDraftAge(String(persona.age));
    setDraftName(persona.name);
  }, [persona.age, persona.name]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
      {editing ? (
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input
              className="h-8 text-sm"
              maxLength={NAME_MAX}
              value={draftName}
              onChange={(e) => {
                const next = e.target.value;
                setDraftName(next);
                const trimmed = next.trim();
                if (trimmed.length >= 1 && trimmed.length <= NAME_MAX) {
                  onPatch({ name: trimmed });
                }
              }}
              onBlur={() => {
                if (draftName.trim().length === 0) setDraftName(persona.name);
              }}
              placeholder="Imię"
              aria-label="Imię persony"
            />
            <Input
              className="h-8 w-16 text-sm"
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              value={draftAge}
              onChange={(e) => {
                const next = e.target.value;
                setDraftAge(next);
                const n = Number(next);
                if (next !== "" && Number.isInteger(n) && n >= AGE_MIN && n <= AGE_MAX) {
                  onPatch({ age: n });
                }
              }}
              onBlur={() => {
                const n = Number(draftAge);
                if (draftAge === "" || !Number.isInteger(n) || n < AGE_MIN || n > AGE_MAX) {
                  setDraftAge(String(persona.age));
                }
              }}
              aria-label={`Wiek persony (${AGE_MIN}–${AGE_MAX})`}
            />
          </div>
          <div className="flex gap-1.5">
            <Input
              className="h-8 text-xs flex-1"
              maxLength={PROF_MAX}
              value={persona.profession}
              onChange={(e) => onPatch({ profession: e.target.value })}
              placeholder="Profesja"
              aria-label="Profesja persony"
            />
            <Input
              className="h-8 text-xs w-28"
              maxLength={LOC_MAX}
              value={persona.location}
              onChange={(e) => onPatch({ location: e.target.value })}
              placeholder="Lokalizacja"
              aria-label="Lokalizacja persony"
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
