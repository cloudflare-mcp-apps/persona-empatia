/**
 * Tool: export_persona (app-only)
 *
 * Serializes a persona (plus its frames) to Markdown or JSON. Returns the
 * content inline — does NOT write a file server-side; the widget triggers
 * `app.downloadFile()` or copy-to-clipboard.
 */

import type { Env } from "../types";
import type { ExportPersonaParams } from "../schemas/inputs";
import type { ExportPersonaPayload, FramePayload, PersonaPayload } from "../schemas/outputs";
import {
  EMPATHY_LABELS_PL,
  FRAME_TYPE_LABELS_PL,
  MASLOW_TIERS_PL,
  MOTIVATIONS_PL,
} from "../framework";
import { getFrames, getPersona } from "../db/queries";
import { AiGenerationError } from "../ai/persona-generator";
import { logger, startTimer } from "../shared/logger";
import type { ToolResult } from "./build_persona";

export async function exportPersona(
  env: Env,
  userId: string,
  input: ExportPersonaParams,
): Promise<ToolResult<ExportPersonaPayload>> {
  const actionId = crypto.randomUUID();
  const timer = startTimer();

  logger.info({
    event: "tool_started",
    tool: "export_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    args: { persona_id: input.persona_id, format: input.format },
  });

  const persona = await getPersona(env.DB, userId, input.persona_id);
  if (!persona) {
    logger.error({
      event: "tool_failed",
      tool: "export_persona",
      user_id: userId,
      action_id: actionId,
      error: "persona_not_found",
    });
    throw new AiGenerationError("Nie znaleziono persony o podanym ID.");
  }
  const frames = await getFrames(env.DB, userId, input.persona_id);

  const slug = slugify(persona.name);
  const dateStr = new Date().toISOString().slice(0, 10);
  const ext = input.format === "markdown" ? "md" : "json";
  const filename = `persona-${slug}-${dateStr}.${ext}`;

  const content =
    input.format === "markdown" ? renderMarkdown(persona, frames) : renderJson(persona, frames);
  const byteCount = new TextEncoder().encode(content).length;

  logger.info({
    event: "tool_completed",
    tool: "export_persona",
    user_id: userId,
    user_email: "",
    action_id: actionId,
    duration_ms: timer(),
  });

  return {
    text_pl: `Wyeksportowano personę ${persona.name} jako ${input.format === "markdown" ? "Markdown" : "JSON"} (${byteCount} bajtów).`,
    payload: { content, filename, byte_count: byteCount },
  };
}

function renderMarkdown(persona: PersonaPayload, frames: FramePayload[]): string {
  const maslow = MASLOW_TIERS_PL[persona.maslow_level - 1];
  const motivLines = (Object.keys(MOTIVATIONS_PL) as Array<keyof typeof MOTIVATIONS_PL>)
    .map((k) => `- **${MOTIVATIONS_PL[k]}**: ${persona.motivations[k]}/100`)
    .join("\n");
  const empathyLines = (Object.keys(EMPATHY_LABELS_PL) as Array<keyof typeof EMPATHY_LABELS_PL>)
    .map((k) => `- **${EMPATHY_LABELS_PL[k]}**: ${persona.empathy_map[k] || "_(puste)_"}`)
    .join("\n");
  const painsList = persona.pains.length > 0 ? persona.pains.map((p) => `- ${p}`).join("\n") : "_(brak)_";
  const dreamsList = persona.dreams.length > 0 ? persona.dreams.map((d) => `- ${d}`).join("\n") : "_(brak)_";

  const framesSection =
    frames.length === 0
      ? "_Brak wygenerowanych ramek._"
      : frames
          .map(
            (f) =>
              `### Ramka ${FRAME_TYPE_LABELS_PL[f.frame_type]}\n\n${f.text}\n\n_${f.framework_note}_${
                f.product_hook ? `\n\n_Hook produktu: ${f.product_hook}_` : ""
              }`,
          )
          .join("\n\n");

  return `# Persona: ${persona.name}

**${persona.age} lat · ${persona.profession} · ${persona.location}**

> _Wygenerowane przez Persona & Mapa Empatii (Tkaczyk framework)_
> _Utworzono: ${persona.created_at.slice(0, 10)} · Zaktualizowano: ${persona.updated_at.slice(0, 10)}_

## Kontekst biznesowy

${persona.business}${persona.hints ? `\n\n_Wskazówki:_ ${persona.hints}` : ""}

## Piramida Maslowa

Poziom **${persona.maslow_level}** — **${maslow}**

## Trójkąt 3F

- **Fuck**: ${persona.triangle_3f.fuck}
- **Food**: ${persona.triangle_3f.food}
- **Friends**: ${persona.triangle_3f.friends}

## 6 motywacji

${motivLines}

## Mapa empatii

${empathyLines}

## Dlaczego dziś?

${persona.deep_need ?? "_(jeszcze niewypełnione)_"}

## Bóle

${painsList}

## Marzenia

${dreamsList}

## Ramki copywriterskie

${framesSection}
`;
}

function renderJson(persona: PersonaPayload, frames: FramePayload[]): string {
  return JSON.stringify({ persona, frames }, null, 2);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "persona";
}
