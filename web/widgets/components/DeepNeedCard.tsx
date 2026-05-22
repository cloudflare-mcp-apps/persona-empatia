interface Props {
  value: string | null;
  onChange: (next: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function DeepNeedCard({ value, onChange, onRegenerate, regenerating }: Props) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          „Dlaczego dziś?" (bodziec → potrzeba głęboka)
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted disabled:opacity-50 h-6"
        >
          {regenerating ? "..." : "🔄"}
        </button>
      </div>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`text-[11px] leading-snug p-2 rounded border border-border bg-background resize-none h-12 transition-opacity ${regenerating ? "opacity-50" : ""}`}
        maxLength={280}
        placeholder="Co się zmieniło u klienta TERAZ, że zaczyna myśleć o zakupie?"
        disabled={regenerating}
      />
    </div>
  );
}
