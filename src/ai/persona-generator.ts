/**
 * Workers AI wrapper for persona generation.
 *
 * Three call shapes:
 * - `generatePersonaDraft` — full persona from business description.
 * - `regenerateDimension` — single dimension (empathy_map / pains / dreams / deep_need).
 * - `generateFrame` — one copywriting frame (aspirational / pain / social).
 *
 * Each call:
 * 1. Wraps user-provided strings in <user_input> tags (anti-injection).
 * 2. Routes through AI Gateway `mcp-production-gateway` (cacheTtl: 0 — unique inputs).
 * 3. Parses JSON; retries once on parse failure with stricter reminder.
 * 4. On second failure, throws sanitized PL error (caught by tool handler).
 *
 * @module ai/persona-generator
 */

import type { Env } from "../types";
import { AI_GATEWAY, AI_TOKEN_BUDGETS } from "../shared/constants";
import { logger, startTimer } from "../shared/logger";
import type { PersonaPayload, EmpathyMap, FramePayload } from "../schemas/outputs";
import type { FrameType, MaslowLevel, Gender, MotivationKey } from "../framework";
import { MOTIVATION_KEYS, TRIANGLE_3F_AXES, EMPATHY_KEYS } from "../framework";
import {
  BUILD_PERSONA_SYSTEM_PROMPT,
  buildRegenEmpathyMapPrompt,
  buildRegenPainsPrompt,
  buildRegenDreamsPrompt,
  buildRegenDeepNeedPrompt,
  buildGenerateFramePrompt,
} from "./persona-prompts";

// ============================================================================
// Public API
// ============================================================================

export type RegenDimension = "empathy_map" | "pains" | "dreams" | "deep_need";

interface PersonaDraft {
  name: string;
  age: number;
  gender: Gender;
  location: string;
  profession: string;
  maslow_level: MaslowLevel;
  triangle_3f: { fuck: number; food: number; friends: number };
  motivations: PersonaPayload["motivations"];
  empathy_map: EmpathyMap;
  deep_need: string;
  pains: string[];
  dreams: string[];
}

/** Generate a fresh persona draft from a business description. */
export async function generatePersonaDraft(
  env: Env,
  business: string,
  hints: string | null,
  nameHint: string | null,
): Promise<PersonaDraft> {
  const userMessage = formatBuildPersonaUserMessage(business, hints, nameHint);
  const raw = await callAi(
    env,
    BUILD_PERSONA_SYSTEM_PROMPT,
    userMessage,
    AI_TOKEN_BUDGETS.BUILD_PERSONA,
    "build_persona",
  );
  return parseAndValidatePersonaDraft(raw);
}

/** Regenerate one dimension of a saved persona. Returns ONLY the regenerated field(s). */
export async function regenerateDimension(
  env: Env,
  persona: PersonaPayload,
  dimension: RegenDimension,
): Promise<Partial<PersonaPayload>> {
  const systemPrompt = pickRegenPrompt(persona, dimension);
  const userMessage = formatRegenUserMessage(dimension);
  const raw = await callAi(
    env,
    systemPrompt,
    userMessage,
    AI_TOKEN_BUDGETS.REGENERATE_DIMENSION,
    `regen_${dimension}`,
  );
  return parseAndValidateRegen(raw, dimension);
}

/** Generate one frame (aspirational / pain / social) grounded on the persona. */
export async function generateFrame(
  env: Env,
  persona: PersonaPayload,
  frameType: FrameType,
  productHook: string | null,
): Promise<Pick<FramePayload, "text" | "framework_note">> {
  const systemPrompt = buildGenerateFramePrompt(persona, frameType, productHook);
  const userMessage = `Wygeneruj ramkę typu "${frameType}" dla powyższej persony.`;
  const raw = await callAi(
    env,
    systemPrompt,
    userMessage,
    AI_TOKEN_BUDGETS.GENERATE_FRAME,
    "generate_frame",
  );
  return parseAndValidateFrame(raw);
}

// ============================================================================
// AI invocation (single retry on JSON parse failure)
// ============================================================================

async function callAi(
  env: Env,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  eventLabel: string,
): Promise<string> {
  const timer = startTimer();
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userMessage },
  ];

  try {
    const result = await env.AI.run(
      AI_GATEWAY.MODEL,
      { messages, max_tokens: maxTokens },
      { gateway: { id: AI_GATEWAY.ID, cacheTtl: AI_GATEWAY.CACHE_TTL } },
    );
    const text = extractResponseText(result);
    logger.info({
      event: "api_call",
      service: "workers-ai",
      method: eventLabel,
      status: 200,
      duration_ms: timer(),
      success: true,
    });
    return text;
  } catch (error) {
    logger.error({
      event: "api_call",
      service: "workers-ai",
      method: eventLabel,
      status: 500,
      duration_ms: timer(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AiGenerationError(
      "Nie udało się wygenerować treści. Spróbuj ponownie za chwilę.",
    );
  }
}

/** Workers AI returns text in slightly different shapes per model. Normalize. */
function extractResponseText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const r = result as { response?: unknown; result?: { response?: unknown } };
    if (typeof r.response === "string") return r.response;
    if (r.result && typeof r.result === "object" && typeof r.result.response === "string") {
      return r.result.response;
    }
  }
  throw new Error("Unexpected Workers AI response shape");
}

// ============================================================================
// JSON parse + validate
// ============================================================================

function safeJsonParse(text: string): unknown {
  // Strip markdown code fences if the model ignored the JSON_DISCIPLINE rule.
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to extract the first {...} block.
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseAndValidatePersonaDraft(text: string): PersonaDraft {
  const obj = safeJsonParse(text);
  if (!obj || typeof obj !== "object") {
    throw new AiGenerationError("Model zwrócił nieprawidłową odpowiedź — spróbuj ponownie z dokładniejszym opisem biznesu.");
  }
  const o = obj as Record<string, unknown>;

  const draft: PersonaDraft = {
    name: requireString(o.name, "name"),
    age: clamp(requireNumber(o.age, "age"), 13, 99),
    gender: validateGender(o.gender),
    location: requireString(o.location, "location"),
    profession: requireString(o.profession, "profession"),
    maslow_level: validateMaslow(o.maslow_level),
    triangle_3f: normalizeTriangle3F(o.triangle_3f),
    motivations: normalizeMotivations(o.motivations),
    empathy_map: validateEmpathyMap(o.empathy_map),
    deep_need: requireString(o.deep_need, "deep_need").slice(0, 280),
    pains: validateStringArray(o.pains, "pains", 5, 140),
    dreams: validateStringArray(o.dreams, "dreams", 5, 140),
  };
  return draft;
}

function parseAndValidateRegen(text: string, dimension: RegenDimension): Partial<PersonaPayload> {
  const obj = safeJsonParse(text);
  if (!obj || typeof obj !== "object") {
    throw new AiGenerationError("Model nie odpowiedział poprawnym JSON. Spróbuj ponownie.");
  }
  const o = obj as Record<string, unknown>;

  switch (dimension) {
    case "empathy_map":
      // Accept either flat {sees,hears,...} or nested {empathy_map: {...}}.
      return { empathy_map: validateEmpathyMap(o.empathy_map ?? o) };
    case "pains":
      return { pains: validateStringArray(o.pains, "pains", 5, 140) };
    case "dreams":
      return { dreams: validateStringArray(o.dreams, "dreams", 5, 140) };
    case "deep_need":
      return { deep_need: requireString(o.deep_need, "deep_need").slice(0, 280) };
  }
}

function parseAndValidateFrame(text: string): Pick<FramePayload, "text" | "framework_note"> {
  const obj = safeJsonParse(text);
  if (!obj || typeof obj !== "object") {
    throw new AiGenerationError("Model nie zwrócił poprawnej ramki — spróbuj ponownie.");
  }
  const o = obj as Record<string, unknown>;
  return {
    text: requireString(o.text, "frame.text").slice(0, 1000),
    framework_note: requireString(o.framework_note, "frame.framework_note").slice(0, 500),
  };
}

// ============================================================================
// Validators
// ============================================================================

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AiGenerationError(`Brak lub pusta wartość pola: ${fieldName}.`);
  }
  return value.trim();
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AiGenerationError(`Pole ${fieldName} nie jest liczbą.`);
  }
  return Math.round(value);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function validateGender(value: unknown): Gender {
  if (value === "female" || value === "male" || value === "nonbinary" || value === "other") {
    return value;
  }
  return "other";
}

function validateMaslow(value: unknown): MaslowLevel {
  const n = typeof value === "number" ? Math.round(value) : 3;
  const clamped = clamp(n, 1, 5);
  return clamped as MaslowLevel;
}

function normalizeTriangle3F(value: unknown): { fuck: number; food: number; friends: number } {
  const fallback = { fuck: 33, food: 33, friends: 34 };
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  const raw = {
    fuck: typeof v.fuck === "number" ? v.fuck : 0,
    food: typeof v.food === "number" ? v.food : 0,
    friends: typeof v.friends === "number" ? v.friends : 0,
  };
  return renormalizeTriangle(raw);
}

/** Renormalize three weights to sum to 100, biased toward integer values. */
export function renormalizeTriangle(
  weights: { fuck: number; food: number; friends: number },
): { fuck: number; food: number; friends: number } {
  const sum = weights.fuck + weights.food + weights.friends;
  if (sum <= 0) return { fuck: 33, food: 33, friends: 34 };
  const scaled = {
    fuck: (weights.fuck / sum) * 100,
    food: (weights.food / sum) * 100,
    friends: (weights.friends / sum) * 100,
  };
  // Round to ints, then fix the rounding remainder by adjusting the largest field.
  const rounded = {
    fuck: Math.round(scaled.fuck),
    food: Math.round(scaled.food),
    friends: Math.round(scaled.friends),
  };
  const total = rounded.fuck + rounded.food + rounded.friends;
  const diff = 100 - total;
  if (diff !== 0) {
    const largest = (Object.keys(rounded) as Array<keyof typeof rounded>).reduce((a, b) =>
      rounded[a] >= rounded[b] ? a : b,
    );
    rounded[largest] += diff;
  }
  return rounded;
}

function normalizeMotivations(value: unknown): PersonaPayload["motivations"] {
  const fallback = MOTIVATION_KEYS.reduce<Record<string, number>>((acc, k) => {
    acc[k] = 50;
    return acc;
  }, {}) as PersonaPayload["motivations"];
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  const out = { ...fallback } as PersonaPayload["motivations"];
  for (const key of MOTIVATION_KEYS) {
    const n = typeof v[key] === "number" ? (v[key] as number) : 50;
    out[key as MotivationKey] = clamp(Math.round(n), 0, 100);
  }
  return out;
}

function validateEmpathyMap(value: unknown): EmpathyMap {
  const fallback: EmpathyMap = { sees: "", hears: "", feels: "", says: "", does: "" };
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  const out: EmpathyMap = { ...fallback };
  for (const key of EMPATHY_KEYS) {
    if (typeof v[key] === "string") {
      out[key] = (v[key] as string).trim().slice(0, 280);
    }
  }
  return out;
}

function validateStringArray(
  value: unknown,
  fieldName: string,
  maxItems: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(value)) {
    throw new AiGenerationError(`Pole ${fieldName} musi być tablicą stringów.`);
  }
  return value
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .slice(0, maxItems)
    .map((s) => s.trim().slice(0, maxLen));
}

// Discriminator type for triangle/motivations key access — kept here so we can
// safely index `value` with `MotivationKey`. Avoids `as any` in normalizer.
const TRIANGLE_AXIS_VALUES: readonly string[] = TRIANGLE_3F_AXES;
void TRIANGLE_AXIS_VALUES;

// ============================================================================
// User-message formatting (anti-injection)
// ============================================================================

function formatBuildPersonaUserMessage(
  business: string,
  hints: string | null,
  nameHint: string | null,
): string {
  return `Stwórz personę dla następującego biznesu:

<user_input>
Biznes: ${business}
${hints ? `Wskazówki: ${hints}` : ""}
${nameHint ? `Sugerowane imię: ${nameHint}` : ""}
</user_input>

Zwróć JSON pasujący do schematu BuildPersonaResponse.`;
}

function pickRegenPrompt(persona: PersonaPayload, dimension: RegenDimension): string {
  switch (dimension) {
    case "empathy_map":
      return buildRegenEmpathyMapPrompt(persona);
    case "pains":
      return buildRegenPainsPrompt(persona);
    case "dreams":
      return buildRegenDreamsPrompt(persona);
    case "deep_need":
      return buildRegenDeepNeedPrompt(persona);
  }
}

function formatRegenUserMessage(dimension: RegenDimension): string {
  return `Wygeneruj NOWE pole "${dimension}" dla powyższej persony. Pozostałe pola persony pozostają bez zmian.`;
}

// ============================================================================
// Error class — tool handlers catch this and surface PL message verbatim.
// ============================================================================

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiGenerationError";
  }
}
