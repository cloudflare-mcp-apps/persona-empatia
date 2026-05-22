/**
 * MCP Server Factory for {{SERVER_NAME}} — Cloudflare canonical pattern
 *
 * createServer(env) returns a fresh McpServer per request. The transport
 * layer (createMcpHandler in src/index.ts) handles JSON-RPC dispatch
 * natively via WorkerTransport (Streamable HTTP, March 2025 spec).
 *
 * Auth context (userId, email) is populated by createMcpHandler from the
 * authContext option in src/index.ts; tools access it via getMcpAuthContext().
 *
 * Reference: EXTRACTED/cf-mcp/examples/mcp-worker-authenticated/src/server.ts
 *
 * TODO when adding new tools:
 * 1. Define Zod input schema in src/schemas/inputs.ts
 * 2. Add tool metadata in src/tools/descriptions.ts (TOOL_METADATA)
 * 3. Register the tool below via server.registerTool()
 */

import * as z from "zod/v4";
import type { Env } from "./types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Cloudflare divergence from ext-apps: we use native MCP SDK methods
// (server.registerTool / server.registerResource) instead of ext-apps helpers.
// See .claude/rules/OVERRIDES-ext-apps.md. RESOURCE_MIME_TYPE is just a constant.
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { getMcpAuthContext } from "agents/mcp";
import { TOOL_METADATA, getToolDescription } from "./tools/descriptions";
import { SERVER_CONFIG } from "./shared/constants";
import { UI_RESOURCES } from "./resources/ui-resources";
import { loadHtml } from "./helpers/assets";
import { SERVER_INSTRUCTIONS } from "./server-instructions";
import { logger } from "./shared/logger";

// ============================================================================
// Server factory — fresh McpServer per request (GHSA-345p-7cg4-v4c7 safe)
// ============================================================================

export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: SERVER_CONFIG.NAME,
    version: SERVER_CONFIG.VERSION,
  }, {
    capabilities: { tools: {}, prompts: { listChanged: true }, resources: { listChanged: true } },
    instructions: SERVER_INSTRUCTIONS
  });

  // ========================================================================
  // SEP-1865 MCP Apps: UI Resource Registration
  // ========================================================================
  const widgetResource = UI_RESOURCES.widget;

  server.registerResource(
    "widget",                        // unique name within server
    widgetResource.uri,              // URI — must match tool's _meta.ui.resourceUri
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: widgetResource.description,
      _meta: { ui: widgetResource._meta.ui! }
    },
    async () => {
      const templateHTML = await loadHtml(env.ASSETS, "/widget.html");
      return {
        contents: [{
          uri: widgetResource.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: templateHTML,
          _meta: widgetResource._meta as Record<string, unknown>
        }]
      };
    }
  );

  // ========================================================================
  // Tool Registration
  // TODO: Add your tools here
  // ========================================================================
  server.registerTool(
    "example-tool",
    {
      title: TOOL_METADATA["example-tool"].title,
      description: getToolDescription("example-tool"),
      inputSchema: {
        input: z.string()
          .min(1)
          .meta({ description: "Input string to process" }),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        ui: { resourceUri: widgetResource.uri },
        // Cross-platform: optional ChatGPT status text (Claude ignores harmlessly).
        // Uncomment and customize for better UX during long-running tools:
        // "openai/toolInvocation/invoking": "Processing…",
        // "openai/toolInvocation/invoked": "Done.",
      }
    },
    async (args: { input: string }) => {
      const auth = getMcpAuthContext();
      const userId = (auth?.props?.userId as string | undefined) ?? "anonymous";
      const { input } = args;

      try {
        const result = {
          message: `Processed: ${input}`,
          timestamp: new Date().toISOString(),
          userId,
        };

        logger.info({
          event: 'tool_completed',
          tool: 'example-tool',
          user_id: userId,
          user_email: '',
          action_id: crypto.randomUUID(),
          duration_ms: 0,
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2)
          }],
          structuredContent: result as unknown as Record<string, unknown>,
          _meta: { viewUUID: crypto.randomUUID() }
        };
      } catch (error) {
        logger.error({
          event: 'tool_failed',
          tool: 'example-tool',
          error: error instanceof Error ? error.message : String(error)
        });
        return {
          content: [{
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  return server;
}
