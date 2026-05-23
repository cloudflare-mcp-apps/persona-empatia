import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (next: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function DeepNeedCard({ value, onChange, onRegenerate, regenerating }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-snug">
            Co się zmieniło u klienta TERAZ, że zaczyna myśleć o zakupie? (bodziec → potrzeba głęboka)
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 flex-shrink-0"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-label="Regeneruj bodziec"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
          <span className="text-xs">Regeneruj</span>
        </Button>
      </div>
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "text-sm leading-snug resize-none min-h-[72px]",
          regenerating && "opacity-50",
        )}
        maxLength={280}
        placeholder="np. „Główny klient zagroził odejściem, jeśli nie wdrożymy AI..."
        disabled={regenerating}
        rows={3}
      />
    </div>
  );
}
