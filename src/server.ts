/**
 * MCP Server Factory for Persona & Mapa Empatii — Cloudflare canonical pattern.
 *
 * createServer(env) returns a fresh McpServer per request. The transport layer
 * (createMcpHandler in src/index.ts) handles JSON-RPC dispatch via WorkerTransport.
 *
 * Auth context (userId, email) is populated by createMcpHandler from the
 * authContext option in src/index.ts; tools access it via getMcpAuthContext().
 */

import type { Env } from "./types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Cloudflare divergence from ext-apps: native MCP SDK methods only.
// RESOURCE_MIME_TYPE is just a constant — handler functions stay native.
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { getMcpAuthContext } from "agents/mcp";
import { SERVER_CONFIG } from "./shared/constants";
import { UI_RESOURCES } from "./resources/ui-resources";
import { loadHtml } from "./helpers/assets";
import { SERVER_INSTRUCTIONS } from "./server-instructions";
import { logger } from "./shared/logger";
import {
  BuildPersonaInput,
  RefinePersonaInput,
  GenerateFrameInput,
  LoadPersonaInput,
  ExportPersonaInput,
  type BuildPersonaParams,
  type RefinePersonaParams,
  type GenerateFrameParams,
  type LoadPersonaParams,
  type ExportPersonaParams,
} from "./schemas/inputs";
import {
  buildPersona,
  refinePersona,
  generateFrame,
  loadPersona,
  exportPersona,
  TOOL_METADATA,
  getToolDescription,
  type ToolResult,
} from "./tools";
import { AiGenerationError } from "./ai/persona-generator";
import { registerNowaPersonaPrompt } from "./prompts/nowa-persona";
import { registerPrzepiszZPersonaPrompt } from "./prompts/przepisz-z-persona";

// ============================================================================
// Server factory — fresh McpServer per request (GHSA-345p-7cg4-v4c7 safe)
// ============================================================================

export function createServer(env: Env): McpServer {
  const server = new McpServer(
    { name: SERVER_CONFIG.NAME, version: SERVER_CONFIG.VERSION },
    {
      capabilities: { tools: {}, prompts: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // ========================================================================
  // SEP-1865 MCP Apps: UI Resource Registration
  // ========================================================================
  const widgetResource = UI_RESOURCES.widget;

  server.registerResource(
    "persona_widget",
    widgetResource.uri,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: widgetResource.description,
    },
    async () => {
      const templateHTML = await loadHtml(env.ASSETS, "/widget.html");
      return {
        contents: [
          {
            uri: widgetResource.uri,
            mimeType: RESOURCE_MIME_TYPE,
            text: templateHTML,
            // CRITICAL: _meta.ui.csp / domain / permissions live on the contents[] entry,
            // NOT on registerResource's config object (silently no-ops there).
            _meta: widgetResource._meta as Record<string, unknown>,
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool Registrations (5 tools)
  // ========================================================================

  // Tool 1: build_persona (model-visible)
  server.registerTool(
    "build_persona",
    {
      title: TOOL_METADATA.build_persona.title,
      description: getToolDescription("build_persona"),
      inputSchema: BuildPersonaInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: widgetResource.uri },
      },
    },
    async (params) => {
      const auth = getMcpAuthContext();
      const userId = (auth?.props?.userId as string | undefined) ?? "anonymous";
      const typed = params as BuildPersonaParams;
      return formatToolResult(await buildPersona(env, userId, typed));
    },
  );

  // Tool 2: refine_persona (app-only)
  server.registerTool(
    "refine_persona",
    {
      title: TOOL_METADATA.refine_persona.title,
      description: getToolDescription("refine_persona"),
      inputSchema: RefinePersonaInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: widgetResource.uri, visibility: ["app"] },
      },
    },
    async (params) => {
      const auth = getMcpAuthContext();
      const userId = (auth?.props?.userId as string | undefined) ?? "anonymous";
      const typed = params as RefinePersonaParams;
      return formatToolResult(await refinePersona(env, userId, typed));
    },
  );

  // Tool 3: generate_frame (app-only)
  server.registerTool(
    "generate_frame",
    {
      title: TOOL_METADATA.generate_frame.title,
      description: getToolDescription("generate_frame"),
      inputSchema: GenerateFrameInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: widgetResource.uri, visibility: ["app"] },
      },
    },
    async (params) => {
      const auth = getMcpAuthContext();
      const userId = (auth?.props?.userId as string | undefined) ?? "anonymous";
      const typed = params as GenerateFrameParams;
      return formatToolResult(await generateFrame(env, userId, typed));
    },
  );

  // Tool 4: load_persona (model-visible — recall)
  server.registerTool(
    "load_persona",
    {
      title: TOOL_METADATA.load_persona.title,
      description: getToolDescription("load_persona"),
      inputSchema: LoadPersonaInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: widgetResource.uri },
      },
    },
    async (params) => {
      const auth = getMcpAuthContext();
      const userId = (auth?.props?.userId as string | undefined) ?? "anonymous";
      const typed = params as LoadPersonaParams;
      return formatToolResult(await loadPersona(env, userId, typed));
    },
  );

  // Tool 5: export_persona (app-only)
  server.registerTool(
    "export_persona",
    {
      title: TOOL_METADATA.export_persona.title,
      description: getToolDescription("export_persona"),
      inputSchema: ExportPersonaInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: widgetResource.uri, visibility: ["app"] },
      },
    },
    async (params) => {
      const auth = getMcpAuthContext();
      const userId = (auth?.props?.userId as string | undefined) ?? "anonymous";
      const typed = params as ExportPersonaParams;
      return formatToolResult(await exportPersona(env, userId, typed));
    },
  );

  // ========================================================================
  // Prompt Registrations (2 prompts)
  // ========================================================================
  registerNowaPersonaPrompt(server);
  registerPrzepiszZPersonaPrompt(server);

  return server;
}

// ============================================================================
// Result formatter — dual return (content + structuredContent) + error mapping
// ============================================================================

function formatToolResult<P>(
  result: ToolResult<P>,
): {
  content: [{ type: "text"; text: string }];
  structuredContent: Record<string, unknown>;
  _meta: { viewUUID: string };
} {
  return {
    content: [{ type: "text" as const, text: result.text_pl }],
    structuredContent: result.payload as unknown as Record<string, unknown>,
    _meta: { viewUUID: crypto.randomUUID() },
  };
}

// Top-level error wrapper — used by tool handlers via try/catch is too brittle;
// instead each handler throws AiGenerationError which produces user-facing PL text.
// The SDK catches thrown errors and returns isError:true automatically.
// We export this here for documentation/use elsewhere; not directly invoked.
export { AiGenerationError };

// Silence unused-import warnings when this module is partially imported.
void logger;
