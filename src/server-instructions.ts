/**
 * Server-level instructions wired via McpServer constructor's `instructions` field.
 * Cloudflare canonical pattern (post-2026-04-25), NOT the legacy `serverInfo` assignment.
 *
 * Length cap: <300 words (per `guides/server_instruction_guide.md`).
 * Language: Polish examples + framework terms; structural English so the host LLM
 * can index it as a system-level brief.
 */

export const SERVER_INSTRUCTIONS = `
Persona & Mapa Empatii — copywriter's persona builder using the Tkaczyk framework (Maslow + 3F + 6 motivations + sensory empathy map + "dlaczego dziś?"). Per-user persistence; personas recallable across conversations.

## Key Capabilities

- Build a framework-grounded persona from a 1–2 sentence business description.
- Refine any dimension via sliders/text edits (or natural language); regenerate single dimensions on demand.
- Generate sensory copywriting frames (aspirational / pain / social) grounded in the persona.
- Recall saved personas across sessions; export to Markdown or JSON.

## Usage Patterns

- Always call \`build_persona\` to create a fresh persona — it returns a persistent \`persona_id\` and renders the widget. Do NOT try to assemble a persona in chat without calling the tool.
- For follow-up sessions, call \`load_persona\` (no args = list mode) when the user mentions an existing persona by name or "moje persony".
- \`refine_persona\` is widget-driven; in chat, prefer to describe the desired change and let the model emit the delta (e.g., "zmień wiek na 35" → \`refine_persona({ persona_id, delta: { age: 35 } })\`).
- \`generate_frame\` produces one frame per call — to fill all three types, make three calls.

## Prompts

- /nowa-persona: guided 30-second onboarding — asks 1–2 PL questions, then calls \`build_persona\`.
- /przepisz-z-persona: rewrite a pasted copy snippet using a loaded persona as constraint set. Reflection runs on user's LLM (zero inference cost on our side).

## Performance & Limits

- \`build_persona\` and \`generate_frame\`: ~2–3s (one Workers AI call each).
- All other tools: <500ms (D1 only).
- Each user has unlimited personas; \`load_persona\` list mode caps at 20.

## Language

Targets Polish-speaking users (wtyczki.ai). Respond to the user in Polish unless they explicitly switch language. Tool result content[] is already Polish — pass through verbatim, don't re-translate. Framework terminology (Maslow / 3F / "ramka aspiracyjna" / "dlaczego dziś") stays Polish even in English contexts; it's the source-material vocabulary.

## Example queries (Polish)

- "Stwórz personę dla mojego sklepu z butami biegowymi dla amatorów."
- "Napisz ramkę aspiracyjną dla Małgosi."
- "Pokaż moje ostatnie persony."
- "Wyeksportuj Małgosię w markdown."
- "Przepisz tę reklamę pod Małgosię: [...]"

## Important Notes

- Authentication is automatic (WorkOS AuthKit JWT); no per-user credentials.
- The widget is the primary surface for refinement; build_persona returns a fully formed draft so the widget opens with content, not a blank state.
- Persona JSON exported via export_persona is forward-compatible with the planned audyt-copy server.


Respond in Polish by default; if the user writes in another language, reply in that language.
`.trim();

export default SERVER_INSTRUCTIONS;
