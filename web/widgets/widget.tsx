import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import "../styles/globals.css";
import type {
  FramePayload,
  FrameType,
  PersonaPayload,
  PersonaDelta,
  RegenDimension,
  EmpathyMap,
  Motivations,
  Triangle3F,
  ExportPersonaPayload,
  LoadPersonaPayload,
  MaslowLevel,
} from "../lib/types";
import { MASLOW_TIERS_PL } from "../lib/types";
import { PersonaHeader } from "./components/PersonaHeader";
import { MaslowPyramid } from "./components/MaslowPyramid";
import { Triangle3F as Triangle3FViz } from "./components/Triangle3F";
import { MotivationBars } from "./components/MotivationBars";
import { EmpathyGrid } from "./components/EmpathyGrid";
import { DeepNeedCard } from "./components/DeepNeedCard";
import { FramesPanel } from "./components/FramesPanel";
import { debounce } from "./lib/debounce";
import { dominantAxis } from "./lib/persona-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const log = {
  info: console.log.bind(console, "[persona]"),
  warn: console.warn.bind(console, "[persona]"),
  error: console.error.bind(console, "[persona]"),
};

type AppStatus = "idle" | "loading" | "ready" | "error";

interface ToolResultEnvelope {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  _meta?: { viewUUID?: unknown };
}

function isPersonaPayload(x: unknown): x is PersonaPayload {
  return (
    !!x &&
    typeof x === "object" &&
    "persona_id" in x &&
    "empathy_map" in x &&
    "triangle_3f" in x
  );
}

function isFramePayload(x: unknown): x is FramePayload {
  return !!x && typeof x === "object" && "frame_id" in x && "frame_type" in x;
}

function isLoadPersonaPayload(x: unknown): x is LoadPersonaPayload {
  return !!x && typeof x === "object" && "mode" in x;
}

function isExportPayload(x: unknown): x is ExportPersonaPayload {
  return !!x && typeof x === "object" && "content" in x && "filename" in x;
}

function Widget() {
  const [app, setApp] = useState<App | null>(null);
  const [appError, setAppError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [persona, setPersona] = useState<PersonaPayload | null>(null);
  const [frames, setFrames] = useState<FramePayload[]>([]);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const [regenInFlight, setRegenInFlight] = useState<RegenDimension | null>(null);
  const [generatingFrame, setGeneratingFrame] = useState<FrameType | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const personaRef = useRef<PersonaPayload | null>(null);
  personaRef.current = persona;
  const appRef = useRef<App | null>(null);
  appRef.current = app;

  // =========================================================================
  // App lifecycle — handlers BEFORE connect, autoResize:false, sendSizeChanged
  // =========================================================================
  useEffect(() => {
    const appInstance = new App(
      { name: "persona-empatia-mcp", version: "1.0.0" },
      {},
      { autoResize: false },
    );

    appInstance.ontoolinput = () => setStatus("loading");

    appInstance.ontoolresult = (result) => {
      try {
        const envelope = result as unknown as ToolResultEnvelope;
        const payload = envelope.structuredContent;
        if (!payload) return;

        if (isLoadPersonaPayload(payload)) {
          if (payload.mode === "single") {
            const { mode: _mode, ...personaFields } = payload;
            void _mode;
            setPersona(personaFields as PersonaPayload);
            setFrames([]); // server doesn't include frames in load_persona; widget starts fresh
            setStatus("ready");
          } else if (payload.mode === "list") {
            // List mode: nothing to render in the persona widget; keep current state.
            // The model decides which persona to load next.
          } else if (payload.mode === "not_found") {
            setStatus("error");
            setRefineError("Nie znaleziono persony.");
          }
        } else if (isPersonaPayload(payload)) {
          setPersona(payload);
          setStatus("ready");
          setRefineError(null);
        } else if (isFramePayload(payload)) {
          setFrames((prev) => [payload, ...prev]);
          setGeneratingFrame(null);
        } else if (isExportPayload(payload)) {
          triggerDownload(payload);
        }
      } catch (e) {
        log.error("ontoolresult parse error", e);
        setStatus("error");
        setRefineError("Nieprawidłowa odpowiedź serwera.");
      }
    };

    appInstance.onerror = (err) => {
      const message = err instanceof Error ? err.message : String(err);
      // Non-fatal transport noise: some hosts (e.g. mcpjam-inspector 2.5.x) re-emit
      // the initialize response on hostContext/tool updates, which the SDK's
      // pending-request map no longer recognizes. Don't blow up the UI for these.
      if (message.includes("unknown message ID") || message.includes("unknown message id")) {
        log.warn("ignoring duplicate/unknown response from host", err);
        return;
      }
      log.error("onerror", err);
      setAppError(err instanceof Error ? err : new Error(message));
    };

    appInstance.onhostcontextchanged = (ctx) => {
      setHostContext((prev) => ({ ...prev, ...ctx }));
      if (ctx.theme) applyDocumentTheme(ctx.theme);
      if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
      if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
    };

    appInstance.onteardown = async () => ({});

    appInstance
      .connect()
      .then(() => {
        setApp(appInstance);
        setHostContext(appInstance.getHostContext());
        appInstance.sendSizeChanged({ height: 500 });
      })
      .catch((e) => {
        log.error("connect failed", e);
        setAppError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      appInstance.close();
    };
  }, []);

  // =========================================================================
  // Server calls
  // =========================================================================

  /** Send a delta to the server, optionally with a regen dimension. */
  const callRefine = useCallback(
    async (delta: PersonaDelta, regenerate?: RegenDimension) => {
      const current = personaRef.current;
      const a = appRef.current;
      if (!a || !current) return;
      try {
        if (regenerate) setRegenInFlight(regenerate);
        await a.callServerTool({
          name: "refine_persona",
          arguments: {
            persona_id: current.persona_id,
            delta: delta as unknown as Record<string, unknown>,
            ...(regenerate ? { regenerate } : {}),
          },
        });
        // Server response arrives via ontoolresult and replaces persona state.
      } catch (e) {
        log.error("refine_persona failed", e);
        setRefineError("Nie udało się zaktualizować persony.");
      } finally {
        if (regenerate) setRegenInFlight(null);
      }
    },
    [],
  );

  const debouncedRefine = useMemo(
    () => debounce((delta: PersonaDelta) => callRefine(delta), 300),
    [callRefine],
  );

  /** Apply a local optimistic patch + schedule a debounced server commit. */
  const patchPersona = useCallback(
    (patch: Partial<PersonaPayload>) => {
      setPersona((prev) => (prev ? { ...prev, ...patch } : prev));
      debouncedRefine(patch as PersonaDelta);
    },
    [debouncedRefine],
  );

  const requestRegenerate = useCallback(
    (dimension: RegenDimension) => {
      callRefine({} as PersonaDelta, dimension);
    },
    [callRefine],
  );

  const requestFrame = useCallback(
    async (type: FrameType) => {
      const current = personaRef.current;
      const a = appRef.current;
      if (!a || !current) return;
      try {
        setGeneratingFrame(type);
        await a.callServerTool({
          name: "generate_frame",
          arguments: { persona_id: current.persona_id, frame_type: type },
        });
      } catch (e) {
        log.error("generate_frame failed", e);
        setGeneratingFrame(null);
      }
    },
    [],
  );

  const requestExport = useCallback(
    async (format: "markdown" | "json") => {
      const current = personaRef.current;
      const a = appRef.current;
      if (!a || !current) return;
      try {
        await a.callServerTool({
          name: "export_persona",
          arguments: { persona_id: current.persona_id, format },
        });
      } catch (e) {
        log.error("export_persona failed", e);
      }
    },
    [],
  );

  const removeFrameLocal = useCallback((frameId: string) => {
    setFrames((prev) => prev.filter((f) => f.frame_id !== frameId));
  }, []);

  // =========================================================================
  // Model context updates — keep the model aware of persona summary
  // =========================================================================
  useEffect(() => {
    if (!app || !persona) return;
    const summary = `Persona: ${persona.name}, ${persona.age}, ${persona.profession} (${persona.location}). Maslow ${persona.maslow_level} (${MASLOW_TIERS_PL[persona.maslow_level - 1]}). 3F dominanta: ${dominantAxis(persona.triangle_3f).label}. Dlaczego dziś: ${persona.deep_need ?? "—"}.`;
    app.updateModelContext({
      content: [{ type: "text", text: summary }],
    }).catch((e) => log.warn("updateModelContext failed", e));
  }, [app, persona]);

  // =========================================================================
  // Safe area + render
  // =========================================================================
  const safeAreaStyle: React.CSSProperties = {
    paddingTop: hostContext?.safeAreaInsets?.top,
    paddingRight: hostContext?.safeAreaInsets?.right,
    paddingBottom: hostContext?.safeAreaInsets?.bottom,
    paddingLeft: hostContext?.safeAreaInsets?.left,
  };

  if (appError) {
    return (
      <div className="h-[500px] flex items-center justify-center p-4 text-sm text-destructive" style={safeAreaStyle}>
        Błąd: {appError.message}
      </div>
    );
  }

  if (status === "idle" && !persona) {
    return (
      <div className="h-[500px] flex items-center justify-center p-4 text-[11px] text-muted-foreground" style={safeAreaStyle}>
        Łączenie z hostem…
      </div>
    );
  }

  if (status === "loading" && !persona) {
    return (
      <div className="h-[500px] flex items-center justify-center p-4 text-[11px] text-muted-foreground" style={safeAreaStyle}>
        Generowanie persony… (~2-3 s)
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="h-[500px] flex items-center justify-center p-4 text-[11px] text-muted-foreground" style={safeAreaStyle}>
        Brak persony. Wywołaj <code className="px-1">build_persona</code> w czacie.
      </div>
    );
  }

  return (
    <div className="h-[500px] flex flex-col bg-background text-foreground overflow-hidden" style={safeAreaStyle}>
      <div className="flex-shrink-0">
        <PersonaHeader
          persona={persona}
          onPatch={patchPersona}
          onExportMd={() => requestExport("markdown")}
          onExportJson={() => requestExport("json")}
        />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Persona kwantyfikacyjna</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-0">
              <MaslowPyramid
                level={persona.maslow_level}
                onChange={(level: MaslowLevel) => patchPersona({ maslow_level: level })}
              />
              <Triangle3FViz
                value={persona.triangle_3f}
                onChange={(t: Triangle3F) => patchPersona({ triangle_3f: t })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">6 motywacji</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MotivationBars
                value={persona.motivations}
                onChange={(m: Motivations) => patchPersona({ motivations: m })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mapa empatii</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <EmpathyGrid
                value={persona.empathy_map}
                onChange={(e: EmpathyMap) => patchPersona({ empathy_map: e })}
                onRegenerate={() => requestRegenerate("empathy_map")}
                regenerating={regenInFlight === "empathy_map"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">„Dlaczego dziś?"</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DeepNeedCard
                value={persona.deep_need}
                onChange={(v) => patchPersona({ deep_need: v })}
                onRegenerate={() => requestRegenerate("deep_need")}
                regenerating={regenInFlight === "deep_need"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ramki copywriterskie</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <FramesPanel
                frames={frames}
                generating={generatingFrame}
                onGenerate={requestFrame}
                onRemove={removeFrameLocal}
              />
            </CardContent>
          </Card>

          {refineError && (
            <p className="text-xs text-destructive">{refineError}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Trigger a browser download from an ExportPersonaPayload. */
function triggerDownload(payload: ExportPersonaPayload) {
  try {
    const mime = payload.filename.endsWith(".json") ? "application/json" : "text/markdown";
    const blob = new Blob([payload.content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = payload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error("[persona] download failed", e);
  }
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Widget />
    </StrictMode>,
  );
}
