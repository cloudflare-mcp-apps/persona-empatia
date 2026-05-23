import { useState } from "react";
import { Check, Download, Pencil } from "lucide-react";
import type { PersonaPayload } from "../../lib/types";
import { MASLOW_TIERS_PL } from "../../lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { dominantAxis, initialsFromName, topMotivation } from "../lib/persona-helpers";

interface Props {
  persona: PersonaPayload;
  onPatch: (patch: Partial<PersonaPayload>) => void;
  onExportMd: () => void;
  onExportJson: () => void;
}

export function PersonaHeader({ persona, onPatch, onExportMd, onExportJson }: Props) {
  const [editing, setEditing] = useState(false);
  const axis = dominantAxis(persona.triangle_3f);
  const top = topMotivation(persona.motivations);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-2 p-3 border-b border-border bg-background">
        {/* Row 1: identity + actions */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="text-xs font-semibold">
              {initialsFromName(persona.name)}
            </AvatarFallback>
          </Avatar>

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
              <p className="text-xs text-muted-foreground truncate">
                {persona.profession} · {persona.location}
              </p>
            </div>
          )}

          <div className="flex gap-1 flex-shrink-0">
            {editing ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={() => setEditing(false)}
                aria-label="Zapisz zmiany"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setEditing(true)}
                      aria-label="Edytuj personę"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edytuj imię / profesję / lokalizację</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={onExportMd}
                      aria-label="Eksportuj jako Markdown"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-xs">MD</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Pobierz personę jako Markdown</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={onExportJson}
                      aria-label="Eksportuj jako JSON"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-xs">JSON</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Pobierz personę jako JSON</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Row 2: summary badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="font-normal">
            Maslow {persona.maslow_level}: {MASLOW_TIERS_PL[persona.maslow_level - 1]}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            3F: {axis.label} {axis.value}%
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Top: {top.label} {top.value}
          </Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}
