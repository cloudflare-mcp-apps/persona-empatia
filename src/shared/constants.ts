/**
 * Constants for Persona & Mapa Empatii MCP Server
 *
 * Centralizes all configuration values.
 */

export const SERVER_CONFIG = {
  NAME: "Persona & Mapa Empatii",
  VERSION: "1.0.0",
  SERVER_ID: "persona-empatia",
} as const;

/**
 * AI Gateway routing — all Workers AI calls flow through this gateway
 * for caching + observability (mcp-production-gateway, cacheTtl: 0 because
 * persona generation is unique per-input).
 */
export const AI_GATEWAY = {
  ID: "mcp-production-gateway",
  MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  CACHE_TTL: 0,
} as const;

/**
 * Token budgets for Workers AI calls per PRP §3.7.
 */
export const AI_TOKEN_BUDGETS = {
  BUILD_PERSONA: 800,
  REGENERATE_DIMENSION: 400,
  GENERATE_FRAME: 350,
} as const;
