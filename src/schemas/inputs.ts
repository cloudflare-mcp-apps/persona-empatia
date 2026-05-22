/**
 * Input schemas for Persona & Mapa Empatii MCP tools.
 *
 * Zod 4 plain-object pattern (ZodRawShapeCompat) — MCP SDK consumes these
 * directly via `inputSchema`. Do not wrap in `z.object()`. Do not use
 * `.describe()` or `.default()` in fields (rules: server-registration.md +
 * OVERRIDES-zod.md).
 *
 * @module schemas/inputs
 */

import * as z from "zod/v4";

// ============================================================================
// Tool 1: build_persona
// ============================================================================

export const BuildPersonaInput = {
  business: z.string()
    .min(5)
    .max(500)
    .meta({ description: "What the user sells, in 1–2 sentences. Example: 'kursy hiszpańskiego online dla pracujących'." }),
  hints: z.string()
    .max(200)
    .optional()
    .meta({ description: "Optional known audience traits or context. Example: '20–40 lat, home office, pre-intermediate level'." }),
  persona_name_hint: z.string()
    .max(40)
    .optional()
    .meta({ description: "Optional first name to assign to the persona. Omit to let the LLM choose a Polish name fitting the demographic." }),
};

export interface BuildPersonaParams {
  business: string;
  hints?: string;
  persona_name_hint?: string;
}

// ============================================================================
// Tool 2: refine_persona
// ============================================================================
//
// The delta uses a plain object inside z.object() because z.object().partial()
// is the only ergonomic Zod 4 way to express "any subset of these fields".
// The TOP-level inputSchema (RefinePersonaInput) is still a plain object as
// required by the MCP SDK — only the nested `delta` field is a z.object().

const Triangle3FShape = z.object({
  fuck: z.number().int().min(0).max(100),
  food: z.number().int().min(0).max(100),
  friends: z.number().int().min(0).max(100),
});

const MotivationsShape = z.object({
  pain: z.number().int().min(0).max(100),
  pleasure: z.number().int().min(0).max(100),
  fear: z.number().int().min(0).max(100),
  hope: z.number().int().min(0).max(100),
  belonging: z.number().int().min(0).max(100),
  rejection: z.number().int().min(0).max(100),
});

const EmpathyMapShape = z.object({
  sees: z.string().max(280),
  hears: z.string().max(280),
  feels: z.string().max(280),
  says: z.string().max(280),
  does: z.string().max(280),
}).partial();

const PersonaDelta = z.object({
  name: z.string().max(40).optional(),
  age: z.number().int().min(13).max(99).optional(),
  gender: z.enum(["female", "male", "nonbinary", "other"]).optional(),
  location: z.string().max(80).optional(),
  profession: z.string().max(80).optional(),
  maslow_level: z.number().int().min(1).max(5).optional(),
  triangle_3f: Triangle3FShape.optional()
    .meta({ description: "Weights — server renormalizes to sum 100 if off." }),
  motivations: MotivationsShape.optional()
    .meta({ description: "Each motivation 0–100, independent (not normalized)." }),
  empathy_map: EmpathyMapShape.optional(),
  deep_need: z.string().max(280).nullable().optional(),
  pains: z.array(z.string().max(140)).max(5).optional(),
  dreams: z.array(z.string().max(140)).max(5).optional(),
});

export const RefinePersonaInput = {
  persona_id: z.string()
    .min(20)
    .max(40)
    .meta({ description: "ID of the persona to update." }),
  delta: PersonaDelta
    .meta({ description: "Any subset of persona fields to overwrite. Omit (or pass {}) to only trigger regeneration." }),
  regenerate: z.enum(["empathy_map", "pains", "dreams", "deep_need"])
    .optional()
    .meta({ description: "Re-run Workers AI for one dimension using current persona state as grounding. Runs AFTER delta is applied." }),
};

export interface RefinePersonaParams {
  persona_id: string;
  delta: z.infer<typeof PersonaDelta>;
  regenerate?: "empathy_map" | "pains" | "dreams" | "deep_need";
}

// ============================================================================
// Tool 3: generate_frame
// ============================================================================

export const GenerateFrameInput = {
  persona_id: z.string()
    .min(20)
    .max(40)
    .meta({ description: "ID of the persona to ground the frame on." }),
  frame_type: z.enum(["aspirational", "pain", "social"])
    .meta({ description: "Which framework frame to generate: aspirational (future success), pain (current pain), social (belonging)." }),
  product_hook: z.string()
    .max(200)
    .optional()
    .meta({ description: "Optional product/feature to weave into the frame. Omit for persona-only framing." }),
};

export interface GenerateFrameParams {
  persona_id: string;
  frame_type: "aspirational" | "pain" | "social";
  product_hook?: string;
}

// ============================================================================
// Tool 4: load_persona
// ============================================================================

export const LoadPersonaInput = {
  persona_id: z.string()
    .min(20)
    .max(40)
    .optional()
    .meta({ description: "Specific persona ID to load. Omit for list mode (recent personas)." }),
  limit: z.number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .meta({ description: "List-mode result cap (default 5, max 20). Applied only when persona_id is omitted." }),
};

export interface LoadPersonaParams {
  persona_id?: string;
  limit?: number;
}

// ============================================================================
// Tool 5: export_persona
// ============================================================================

export const ExportPersonaInput = {
  persona_id: z.string()
    .min(20)
    .max(40)
    .meta({ description: "ID of the persona to export." }),
  format: z.enum(["markdown", "json"])
    .meta({ description: "Output format. Markdown for human reading / workshop docs; JSON for downstream tools." }),
};

export interface ExportPersonaParams {
  persona_id: string;
  format: "markdown" | "json";
}
