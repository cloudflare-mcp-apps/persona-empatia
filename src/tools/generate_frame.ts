/**
 * Tool: generate_frame (app-only)
 *
 * Generates one copywriting frame (aspirational / pain / social) grounded on
 * a saved persona via Workers AI, persists the frame row, returns the payload.
 *
 * Graceful miss: unknown persona_id returns mode:"not_found" payload + a PL
 * recovery hint instead of an isError result, so the model can self-correct
 * by calling load_persona.
 */

import type { Env } from "../types";
import type { GenerateFrameParams } from "../schemas/inputs";
import type { FramePayload } from "../schemas/outputs";
import { FRAME_TYPE_LABELS_PL } from "../framework";
import { getPersona, insertFrame } from "../db/queries";
import { generateFrame as aiGenerateFrame } from "../ai/persona-generator";
import { logger, startTimer } from "../shared/logger";
import type { ToolResult } from "./build_persona";

export async function generateFrame(
  env: Env,
  userId: string,
  input: GenerateFrameParams,
): Promise<ToolResult<FramePayload | { mode: "not_found"; persona_id: string }>> {
  const actionId = crypto.randomUUID();
  const timer = startTimer();

  logger.info({
    event: "tool_started",
    tool: "generate_frame",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    args: { persona_id: input.persona_id, frame_type: input.frame_type, has_hook: Boolean(input.product_hook) },
  });

  const persona = await getPersona(env.DB, userId, input.persona_id);
  if (!persona) {
    logger.info({
      event: "tool_completed",
      tool: "generate_frame",
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

  const productHook = input.product_hook ?? null;
  const aiResult = await aiGenerateFrame(env, persona, input.frame_type, productHook);

  const frame: FramePayload = {
    frame_id: crypto.randomUUID(),
    persona_id: persona.persona_id,
    frame_type: input.frame_type,
    text: aiResult.text,
    framework_note: aiResult.framework_note,
    product_hook: productHook,
    generated_at: new Date().toISOString(),
  };

  await insertFrame(env.DB, userId, frame);

  const typeLabel = FRAME_TYPE_LABELS_PL[input.frame_type];
  const textPl = `Ramka ${typeLabel} dla ${persona.name}:\n\n${frame.text}\n\n_${frame.framework_note}_`;

  logger.info({
    event: "tool_completed",
    tool: "generate_frame",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    duration_ms: timer(),
  });

  return { text_pl: textPl, payload: frame };
}
