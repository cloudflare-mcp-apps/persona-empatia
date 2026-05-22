import { StrictMode, useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from '@modelcontextprotocol/ext-apps';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { WidgetState, ToolResultData } from '../lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import '../styles/globals.css';

// Template placeholders — `scripts/lifecycle/create-new-server.sh` replaces
// these literal {{...}} strings via sed during scaffold (Step 3).
const SERVER_NAME = "{{SERVER_NAME}}";
const SERVER_ID = "{{SERVER_ID}}";

// Prefixed logging pattern for better debugging
const log = {
  info: console.log.bind(console, '[Widget]'),
  warn: console.warn.bind(console, '[Widget]'),
  error: console.error.bind(console, '[Widget]'),
};

function Widget() {
  const [state, setState] = useState<WidgetState>({ status: 'idle' });
  const [data, setData] = useState<ToolResultData | null>(null);
  const [viewUUID, setViewUUID] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [app, setApp] = useState<App | null>(null);
  const [appError, setAppError] = useState<Error | null>(null);

  // Manual App instantiation with autoResize: false (prevents width narrowing
  // in Claude Desktop — see .claude/rules/OVERRIDES-ext-apps.md "useApp hook" entry).
  useEffect(() => {
    const appInstance = new App(
      { name: `${SERVER_ID}-mcp`, version: "1.0.0" },
      {},                        // capabilities
      { autoResize: false }      // CRITICAL: prevents width narrowing
    );

    // Register ALL handlers BEFORE connect() — see widget-patterns.md "Handler Registration Order".

    appInstance.ontoolinput = (params) => {
      log.info('Tool input received:', params.arguments);
      setState({ status: 'loading' });
    };

    appInstance.ontoolinputpartial = (params) => {
      log.info('Partial input:', params.arguments);
    };

    appInstance.ontoolresult = (result) => {
      log.info('Tool result received:', result);
      try {
        const uuid = result._meta?.viewUUID ? String(result._meta.viewUUID) : undefined;
        if (uuid) {
          setViewUUID(uuid);
          const savedState = localStorage.getItem(`view-state-${uuid}`);
          if (savedState) {
            log.info('Restoring saved state for viewUUID:', uuid);
            // TODO: Apply restored state to your widget
          }
        }

        let resultData = result.structuredContent;
        if (!resultData && result.content?.[0]) {
          const firstContent = result.content[0];
          if (firstContent.type === 'text' && 'text' in firstContent) {
            resultData = JSON.parse(firstContent.text);
          }
        }

        if (resultData) {
          setData(resultData);
          setState({ status: 'success', data: resultData });
        }
      } catch (e) {
        log.error('Failed to parse result:', e);
        setState({ status: 'error', error: 'Failed to parse result' });
      }
    };

    appInstance.onerror = (error) => {
      log.error('Error:', error);
      setAppError(error instanceof Error ? error : new Error(String(error)));
      setState({ status: 'error', error: String(error) });
    };

    appInstance.onhostcontextchanged = (context) => {
      setHostContext((prev) => ({ ...prev, ...context }));
      if (context.theme) applyDocumentTheme(context.theme);
      if (context.styles?.variables) applyHostStyleVariables(context.styles.variables);
      if (context.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);

      if (context.availableDisplayModes) {
        setCanFullscreen(context.availableDisplayModes.includes('fullscreen'));
      }
      if (context.displayMode) {
        setIsFullscreen(context.displayMode === 'fullscreen');
        document.body.classList.toggle('fullscreen', context.displayMode === 'fullscreen');
      }
    };

    appInstance.ontoolcancelled = (params) => {
      log.info('Tool call cancelled:', params.reason);
      setState({ status: 'idle' });
    };

    appInstance.onteardown = async (params) => {
      log.info('Teardown requested:', params);
      // TODO: Save view state using viewUUID when you have state to persist
      // if (viewUUID) {
      //   localStorage.setItem(`view-state-${viewUUID}`, JSON.stringify({ /* your state */ }));
      // }
      return {};
    };

    // CROSS-PLATFORM: call connect() with NO argument. The SDK auto-detects
    // ChatGPT (openai-mcp-app transport) vs Claude (postMessage transport).
    // Passing PostMessageTransport explicitly forces Claude-only and breaks
    // ChatGPT handshake. See new_docs/cross_platform_mcp_apps.md §TL;DR-4.
    appInstance.connect()
      .then(() => {
        setApp(appInstance);
        setHostContext(appInstance.getHostContext());
        // CRITICAL: autoResize:false suppresses ALL SDK resize messages — sendSizeChanged
        // must be called explicitly so the host knows to make the iframe 500px tall.
        // h-[500px] on the div only sizes the div inside the iframe, not the iframe itself.
        appInstance.sendSizeChanged({ height: 500 });
      })
      .catch((e) => {
        log.error('Failed to connect:', e);
        setAppError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      appInstance.close();
    };
  }, []);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleFullscreen();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  // =========================================================================
  // SDK v1.0.0+ Features
  // =========================================================================

  // 1. YAML Frontmatter for Model Context Updates
  // Use when widget state should inform the AI model
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateModelContext = useCallback(async (contextData: Record<string, unknown>) => {
    if (!app) return;
    const yamlFrontmatter = Object.entries(contextData)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    await app.updateModelContext({
      content: [{
        type: "text",
        text: `---\n${yamlFrontmatter}\n---\n\nWidget state updated.`
      }]
    });
  }, [app]);

  // 2. Fullscreen Mode Toggle (when supported by host)
  const toggleFullscreen = useCallback(async () => {
    if (!app || !canFullscreen) return;
    const ctx = app.getHostContext();
    const targetMode = ctx?.displayMode === "fullscreen" ? "inline" : "fullscreen";
    try {
      const result = await app.requestDisplayMode({ mode: targetMode });
      log.info('Display mode changed to:', result.mode);
    } catch (e) {
      log.error('Failed to change display mode:', e);
    }
  }, [app, canFullscreen]);

  // 3. Report errors to model (for graceful degradation)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const reportErrorToModel = useCallback(async (errorMessage: string) => {
    if (!app) return;
    await app.updateModelContext({
      content: [{
        type: "text",
        text: `Error: ${errorMessage}`
      }]
    });
  }, [app]);

  // 4. Offscreen Pause via IntersectionObserver
  // Pauses polling/animations when widget scrolls offscreen; resumes on re-entry.
  // Critical on mobile (battery) and for widgets with setInterval / video / WebGL.
  // See production_docs/MCP_DESIGN_ADVANCED_PATTERNS.md §17.
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const target = rootRef.current;
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.01 },  // any pixel visible = active
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  // Example: gate polling on visibility. Uncomment when widget polls server.
  // useEffect(() => {
  //   if (!isVisible || !app) return;       // paused — don't poll
  //   const id = setInterval(() => { /* poll */ }, 5_000);
  //   return () => clearInterval(id);
  // }, [isVisible, app]);
  void isVisible;  // silence unused warning until polling is wired up

  // Safe area insets — apply as padding to avoid device notches/system UI.
  // Required for mobile compliance (Tier 1) — see widget-patterns.md §Mobile Compatibility.
  // Touch targets must be ≥ 44pt (use `h-11 min-w-11` on Buttons).
  const safeAreaStyle = {
    paddingTop: hostContext?.safeAreaInsets?.top,
    paddingRight: hostContext?.safeAreaInsets?.right,
    paddingBottom: hostContext?.safeAreaInsets?.bottom,
    paddingLeft: hostContext?.safeAreaInsets?.left,
  };

  // TODO: Implement your widget UI here
  // This is a template - replace with actual functionality

  if (state.status === 'idle') {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center" style={safeAreaStyle}>
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>{SERVER_NAME}</CardTitle>
            <CardDescription>
              TODO: Add widget description and initial state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Waiting for tool input...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center" style={safeAreaStyle}>
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center" style={safeAreaStyle}>
        <Card className="w-full max-w-md mx-4 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{state.error}</p>
            <Button
              className="mt-4"
              onClick={() => setState({ status: 'idle' })}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - display result
  return (
    <div ref={rootRef} className="h-[500px] flex flex-col overflow-hidden" style={safeAreaStyle}>
      <Card className="flex-1 m-4 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{SERVER_NAME}</CardTitle>
            <CardDescription>
              {data?.message || 'Result received'}
            </CardDescription>
          </div>
          {/* Fullscreen toggle button (shows only when host supports it) */}
          {canFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? '⛶' : '⛶'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {/* TODO: Render your result data here */}
          <pre className="text-sm bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Widget />
    </StrictMode>
  );
}
