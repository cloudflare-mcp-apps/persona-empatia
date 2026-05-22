/**
 * Tool: load_persona
 *
 * Two modes:
 * - Single (persona_id given): returns full persona payload.
 * - List (persona_id omitted): returns most-recently-updated personas (default 5).
 *
 * Graceful miss: when persona_id is given but not found, returns mode:"single"
 * with null fields and a Polish "not found" text — NOT an error response, so
 * the model can recover and call list mode.
 */

import type { Env } from "../types";
import type { LoadPersonaParams } from "../schemas/inputs";
import type { LoadPersonaPayload, PersonaListItem, PersonaPayload } from "../schemas/outputs";
import { MASLOW_TIERS_PL } from "../framework";
import { getPersona, listPersonas } from "../db/queries";
import { logger, startTimer } from "../shared/logger";
import type { ToolResult } from "./build_persona";

export async function loadPersona(
  env: Env,
  userId: string,
  input: LoadPersonaParams,
): Promise<ToolResult<LoadPersonaPayload | { mode: "not_found"; persona_id: string }>> {
  const actionId = crypto.randomUUID();
  const timer = startTimer();

  logger.info({
    event: "tool_started",
    tool: "load_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    args: { mode: input.persona_id ? "single" : "list", limit: input.limit ?? null },
  });

  if (input.persona_id) {
    const persona = await getPersona(env.DB, userId, input.persona_id);
    if (!persona) {
      logger.info({
        event: "tool_completed",
        tool: "load_persona",
        user_id: userId,
        user_email: "",
        action_id: actionId,
        duration_ms: timer(),
      });
      return {
        text_pl: `Nie znaleziono persony o ID ${input.persona_id}. Wywołaj load_persona bez argumentów, aby zobaczyć listę.`,
        payload: { mode: "not_found", persona_id: input.persona_id },
      };
    }
    const text = singlePersonaSummary(persona);
    logger.info({
      event: "tool_completed",
      tool: "load_persona",
      user_id: userId,
      user_email: "",
      action_id: actionId,
      duration_ms: timer(),
    });
    return {
      text_pl: text,
      payload: { mode: "single", ...persona },
    };
  }

  const limit = input.limit ?? 5;
  const personas = await listPersonas(env.DB, userId, limit);
  const text = formatListText(personas);

  logger.info({
    event: "tool_completed",
    tool: "load_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    duration_ms: timer(),
  });

  return {
    text_pl: text,
    payload: { mode: "list", personas },
  };
}

function singlePersonaSummary(persona: PersonaPayload): string {
  const maslow = MASLOW_TIERS_PL[persona.maslow_level - 1];
  const { fuck, food, friends } = persona.triangle_3f;
  const max = Math.max(fuck, food, friends);
  const dominant = max === fuck ? "Fuck" : max === food ? "Food" : "Friends";
  return `Załadowano: ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}. Maslow ${persona.maslow_level} (${maslow}), dominacja ${dominant}.`;
}

function formatListText(personas: PersonaListItem[]): string {
  if (personas.length === 0) {
    return "Nie masz jeszcze zapisanych person. Stwórz pierwszą wywołując build_persona.";
  }
  const lines = personas
    .map((p) => `• ${p.name} — ${truncate(p.business, 60)} (${formatRelative(p.updated_at)})`)
    .join("\n");
  return `${personas.length} ostatnich person:\n${lines}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function formatRelative(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "<1h temu";
  if (diffH < 24) return `${diffH}h temu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} dni temu`;
  return iso.slice(0, 10);
}
