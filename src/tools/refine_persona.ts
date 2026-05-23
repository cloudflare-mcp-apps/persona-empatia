/**
 * Tool: refine_persona (app-only)
 *
 * Applies a partial delta to an existing persona, optionally regenerates one
 * dimension via Workers AI (after delta is applied), persists, returns full payload.
 *
 * Graceful miss: unknown persona_id returns mode:"not_found" payload + a PL
 * recovery hint instead of an isError result, so the model can self-correct
 * by calling load_persona.
 */

import type { Env } from "../types";
import type { RefinePersonaParams } from "../schemas/inputs";
import type { PersonaPayload } from "../schemas/outputs";
import { getPersona, updatePersona } from "../db/queries";
import {
  regenerateDimension,
  renormalizeTriangle,
} from "../ai/persona-generator";
import { logger, startTimer } from "../shared/logger";
import type { ToolResult } from "./build_persona";

export async function refinePersona(
  env: Env,
  userId: string,
  input: RefinePersonaParams,
): Promise<ToolResult<PersonaPayload | { mode: "not_found"; persona_id: string }>> {
  const actionId = crypto.randomUUID();
  const timer = startTimer();

  logger.info({
    event: "tool_started",
    tool: "refine_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    args: {
      persona_id: input.persona_id,
      delta_keys: Object.keys(input.delta ?? {}),
      regenerate: input.regenerate ?? null,
    },
  });

  const current = await getPersona(env.DB, userId, input.persona_id);
  if (!current) {
    logger.info({
      event: "tool_completed",
      tool: "refine_persona",
      user_id: userId,
      user_email: "",
      action_id: actionId,
      duration_ms: timer(),
    });
    return {
      text_pl: `Nie znaleziono persony o ID ${input.persona_id}. Wywołaj load_persona bez argumentów, aby zobaczyć listę zapisanych person.`,
      payload: { mode: "not_found", persona_id: input.persona_id },
    };
  }

  const merged = applyDelta(current, input.delta ?? {});

  let final: PersonaPayload = merged;
  if (input.regenerate) {
    try {
      const regen = await regenerateDimension(env, merged, input.regenerate);
      final = { ...merged, ...regen };
    } catch (error) {
      // Regen failure should NOT block the delta update — log and continue with merged state.
      logger.warn({
        event: "api_call",
        service: "workers-ai",
        method: `regen_${input.regenerate}`,
        status: 500,
        duration_ms: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  final.updated_at = new Date().toISOString();
  await updatePersona(env.DB, userId, final);

  const changedKeys = Object.keys(input.delta ?? {}).filter((k) => k in (input.delta ?? {}));
  const changedSummary = changedKeys.length > 0 ? changedKeys.join(", ") : "regeneracja";
  const textPl = `Zaktualizowano personę ${final.name} (${changedSummary}).`;

  logger.info({
    event: "tool_completed",
    tool: "refine_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    duration_ms: timer(),
  });

  return { text_pl: textPl, payload: final };
}

function applyDelta(
  current: PersonaPayload,
  delta: NonNullable<RefinePersonaParams["delta"]>,
): PersonaPayload {
  const out: PersonaPayload = { ...current };
  if (delta.name !== undefined) out.name = delta.name;
  if (delta.age !== undefined) out.age = delta.age;
  if (delta.gender !== undefined) out.gender = delta.gender;
  if (delta.location !== undefined) out.location = delta.location;
  if (delta.profession !== undefined) out.profession = delta.profession;
  if (delta.maslow_level !== undefined) {
    out.maslow_level = delta.maslow_level as PersonaPayload["maslow_level"];
  }
  if (delta.triangle_3f !== undefined) {
    out.triangle_3f = renormalizeTriangle(delta.triangle_3f);
  }
  if (delta.motivations !== undefined) {
    out.motivations = delta.motivations;
  }
  if (delta.empathy_map !== undefined) {
    out.empathy_map = { ...current.empathy_map, ...delta.empathy_map };
  }
  if (delta.deep_need !== undefined) {
    out.deep_need = delta.deep_need;
  }
  if (delta.pains !== undefined) out.pains = delta.pains;
  if (delta.dreams !== undefined) out.dreams = delta.dreams;
  return out;
}
