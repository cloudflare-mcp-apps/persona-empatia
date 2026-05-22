/**
 * Tool descriptions for Persona & Mapa Empatii.
 *
 * 4-part description pattern: purpose → returns → use case → constraints.
 *
 * @module tools/descriptions
 */

export interface ToolMetadata {
  title: string;
  description: {
    part1_purpose: string;
    part2_returns: string;
    part3_useCase: string;
    part4_constraints: string;
  };
  examples: {
    scenario: string;
    description: string;
  }[];
}

export const TOOL_METADATA = {
  build_persona: {
    title: "Stwórz personę copywriterską",
    description: {
      part1_purpose:
        "Generate a copywriter's persona draft from a 1–2 sentence business description, using the Tkaczyk framework: assigned name + age + profession + location, Maslow level the product targets, 3F triangle weights, 6-motivation profile, and an initial sensory empathy map.",
      part2_returns:
        "Returns the full persona JSON plus a persistent persona_id, then renders the interactive widget for refinement.",
      part3_useCase:
        "Use when the user says 'stwórz personę', 'kim jest mój klient', 'do kogo mam pisać', or pastes a product/business description and asks for a target audience.",
      part4_constraints:
        "Note: persona language is Polish (framework fidelity); business description must be 5–500 chars.",
    },
    examples: [
      {
        scenario: "Business + hints",
        description: "Build persona for 'kursy hiszpańskiego online dla pracujących', hints '20–40 lat, home office'.",
      },
      {
        scenario: "Business only",
        description: "Build persona from just 'sklep z butami biegowymi dla amatorów' — LLM fills demographic + framework dimensions.",
      },
    ],
  },

  refine_persona: {
    title: "Dopracuj personę",
    description: {
      part1_purpose:
        "Apply a partial update (delta) to a saved persona — used by the widget when the user moves sliders, edits fields, or asks for regeneration of one dimension.",
      part2_returns:
        "Returns the full updated persona with updated_at bumped, so the widget can re-render consistently.",
      part3_useCase:
        "Use when the widget triggers refinement (callServerTool from sliders/inputs) or the user in chat says 'zmień Małgosi wiek na 35', 'przesuń ją wyżej w piramidzie Maslowa'.",
      part4_constraints:
        "Note: 3F weights are renormalized to sum 100 server-side; regenerate runs AFTER delta is applied.",
    },
    examples: [
      { scenario: "Field edit", description: "Change age to 35 via { delta: { age: 35 } }." },
      { scenario: "Regenerate empathy map", description: "Re-roll all 5 empathy fields jointly with { regenerate: 'empathy_map' }." },
    ],
  },

  generate_frame: {
    title: "Wygeneruj ramkę copywriterską",
    description: {
      part1_purpose:
        "Generate a single copywriting 'ramka' for a saved persona — aspirational (future success scene), pain (current pain scene), or social (belonging scene) — using Workers AI with the persona's empathy map + 3F weights + Maslow level as grounding context.",
      part2_returns:
        "Returns one frame as 2–4 sentences of sensory Polish copy plus the framework reasoning so the user understands why this frame fits this persona.",
      part3_useCase:
        "Use when the user asks for 'ramka aspiracyjna', 'ramka bólu', 'napisz scenkę', or clicks the '+ nowa ramka' button in the widget.",
      part4_constraints:
        "Note: each call appends one frame to the persona's frame list; product_hook is optional.",
    },
    examples: [
      { scenario: "Aspirational frame", description: "Generate aspirational scene for the loaded persona." },
      { scenario: "Frame with product hook", description: "Pass product_hook to weave a specific feature into the scene." },
    ],
  },

  load_persona: {
    title: "Wczytaj zapisaną personę",
    description: {
      part1_purpose:
        "Recall a previously built persona by ID, or list the user's recent personas (default 5 most recent) so the model can resume work in a new conversation without rebuilding from scratch.",
      part2_returns:
        "Returns the same persona shape as build_persona (single mode) or a list of recent personas with summary fields (list mode).",
      part3_useCase:
        "Use when the user references 'Małgosia z poprzedniej rozmowy', 'wczorajsza persona', 'moje persony', or the model needs persona context to fulfil a follow-up copywriting task.",
      part4_constraints:
        "Note: list mode caps at 20 results; unknown persona_id returns a graceful 'not found' (not an error).",
    },
    examples: [
      { scenario: "List recent", description: "Call without args to see most-recent personas." },
      { scenario: "Load by ID", description: "Pass persona_id to hydrate the widget with that persona." },
    ],
  },

  export_persona: {
    title: "Wyeksportuj personę",
    description: {
      part1_purpose:
        "Serialize a persona to Markdown (workshop-friendly, headings + sections) or JSON (machine-friendly, for feeding into other tools or storage) and return it inline so the widget can trigger app.downloadFile() or the user can copy/paste.",
      part2_returns:
        "Returns the rendered content string, the filename (slugified persona name + date), and the byte count.",
      part3_useCase:
        "Use when the user asks to 'wyeksportuj personę', 'daj mi tę personę w markdown', or clicks the export button in the widget.",
      part4_constraints:
        "Note: does NOT write a file server-side — the widget is responsible for download/clipboard.",
    },
    examples: [
      { scenario: "Markdown export", description: "Download Małgosia as workshop-ready Markdown." },
      { scenario: "JSON export", description: "Get persona + frames as JSON for downstream tools (planned: audyt-copy)." },
    ],
  },
} as const satisfies Record<string, ToolMetadata>;

export type ToolName = keyof typeof TOOL_METADATA;

export function getToolDescription(toolName: ToolName): string {
  const meta = TOOL_METADATA[toolName];
  const { part1_purpose, part2_returns, part3_useCase, part4_constraints } = meta.description;
  return `${part1_purpose} ${part2_returns} ${part3_useCase} ${part4_constraints}`;
}

export function getToolExamples(toolName: ToolName): readonly { scenario: string; description: string }[] {
  return TOOL_METADATA[toolName].examples;
}
