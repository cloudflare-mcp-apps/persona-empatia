/**
 * Tool: build_persona
 *
 * Generates a fresh persona draft from a business description via Workers AI,
 * persists it to D1, and returns the full payload + a one-line PL summary
 * for the model.
 */

import type { Env } from "../types";
import type { BuildPersonaParams } from "../schemas/inputs";
import type { PersonaPayload } from "../schemas/outputs";
import { MASLOW_TIERS_PL } from "../framework";
import { insertPersona } from "../db/queries";
import { generatePersonaDraft, AiGenerationError } from "../ai/persona-generator";
import { logger, startTimer } from "../shared/logger";

export interface ToolResult<P> {
  text_pl: string;
  payload: P;
}

export async function buildPersona(
  env: Env,
  userId: string,
  input: BuildPersonaParams,
): Promise<ToolResult<PersonaPayload>> {
  const actionId = crypto.randomUUID();
  const timer = startTimer();

  logger.info({
    event: "tool_started",
    tool: "build_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    args: { business_len: input.business.length, has_hints: Boolean(input.hints) },
  });

  try {
    const draft = await generatePersonaDraft(
      env,
      input.business,
      input.hints ?? null,
      input.persona_name_hint ?? null,
    );

    const now = new Date().toISOString();
    const personaId = crypto.randomUUID();

    const persona: PersonaPayload = {
      persona_id: personaId,
      name: draft.name,
      age: draft.age,
      gender: draft.gender,
      location: draft.location,
      profession: draft.profession,
      business: input.business,
      hints: input.hints ?? null,
      maslow_level: draft.maslow_level,
      triangle_3f: draft.triangle_3f,
      motivations: draft.motivations,
      empathy_map: draft.empathy_map,
      deep_need: draft.deep_need,
      pains: draft.pains,
      dreams: draft.dreams,
      created_at: now,
      updated_at: now,
    };

    await insertPersona(env.DB, userId, persona);

    const dominant = dominantTriangleAxis(persona);
    const maslowLabel = MASLOW_TIERS_PL[persona.maslow_level - 1];
    const textPl =
      `Stworzono personę: ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}. ` +
      `Maslow ${persona.maslow_level} (${maslowLabel}), dominacja ${dominant} w 3F. ` +
      `Otwórz widget, aby dopracować.`;

    logger.info({
      event: "tool_completed",
      tool: "build_persona",
      user_id: userId,
      user_email: "",
      action_id: actionId,
      duration_ms: timer(),
    });

    return { text_pl: textPl, payload: persona };
  } catch (error) {
    logger.error({
      event: "tool_failed",
      tool: "build_persona",
      user_id: userId,
      action_id: actionId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof AiGenerationError
      ? error
      : new AiGenerationError("Wystąpił błąd podczas tworzenia persony. Spróbuj ponownie.");
  }
}

function dominantTriangleAxis(persona: PersonaPayload): string {
  const { fuck, food, friends } = persona.triangle_3f;
  const max = Math.max(fuck, food, friends);
  if (max === fuck) return "Fuck";
  if (max === food) return "Food";
  return "Friends";
}
