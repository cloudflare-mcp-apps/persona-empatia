# Plan: Execute `PRPs/persona-empatia.md`

## Context

User approved `PRPs/persona-empatia.md` — a 5-tool MCP App that builds copywriter personas using the Tkaczyk framework (Maslow + 3F + 6 motivations + sensory empathy map). Server uses Workers AI for persona generation. Cross-session recall via `load_persona` is the retention hook.

The scaffold ran successfully (`scripts/lifecycle/create-new-server.sh persona-empatia`) right before plan mode kicked in. Project is at `projects/persona-empatia/`, TypeScript clean, initial commit made.

**Auth + index.ts + well-known + schemas/ scaffolding directory + widget skeleton are already there.** The gap is the domain code (framework, AI layer, D1 schema, 5 tool handlers, prompts, widget components).

## Approach

Build in 4 sequential blocks, each ending with `npx tsc --noEmit` checkpoint. Mirror `projects/sustainability-auditor/` for Cloudflare auth + server.ts shape; mirror `mcp-apps/examples/{scenario-modeler-server,budget-allocator-server}/` for widget patterns (already cited in PRP). No upstream `registerAppTool`/`useApp` patterns — banned per `OVERRIDES-ext-apps.md`.

### Block A — Configuration + Schema (no domain logic yet)

Files to modify in `projects/persona-empatia/`:

- **`wrangler.jsonc`** — replace any remaining `{{SERVER_ID}}` → `persona-empatia` (scaffold should already have done this; verify), uncomment `ai: { binding: "AI" }`.
- **`src/types.ts`** — uncomment `AI: Ai` and make required (no `?`).
- **`src/shared/constants.ts`** — set `SERVER_CONFIG.NAME = "Persona & Mapa Empatii"`, `SERVER_ID = "persona-empatia"`.
- **`migrations/0001_persona_tables.sql`** — new file. Two tables (`persona_personas`, `persona_frames`) with cascade FK + 2 indexes, exactly per PRP §3.6.
- **`src/framework.ts`** — new file. Exports `MASLOW_TIERS_PL`, `MOTIVATIONS_PL`, `TRIANGLE_3F_AXES`, `FRAME_TYPES` as `const` arrays/records. Single source of truth re-imported by both server and widget bundles.
- **`src/schemas/inputs.ts`** — fill with 5 Zod 4 plain-object schemas: `BuildPersonaInputSchema`, `RefinePersonaInputSchema`, `GenerateFrameInputSchema`, `LoadPersonaInputSchema`, `ExportPersonaInputSchema`. Use `import * as z from "zod/v4"` and `.meta({ description })` per `server-registration.md`.
- **`src/schemas/outputs.ts`** — TypeScript interfaces `PersonaPayload`, `FramePayload`, `PersonaListItem`, helper unions.

### Block B — Data + AI layers (pure, no MCP plumbing)

- **`src/db/queries.ts`** — new file. Parameterized D1 statements: `insertPersona`, `updatePersona` (read-modify-write within one promise chain since D1 has no multi-statement transactions yet — use full overwrite), `getPersona`, `listPersonas`, `insertFrame`, `getFrames`. JSON columns serialized via `JSON.stringify`. ULID generation via `crypto.randomUUID()` (good enough — actual `ulid` lib avoided to skip dependency; sortability still works because `updated_at` provides recency).
- **`src/ai/persona-prompts.ts`** — new file. 6 Polish system prompts as template literal exports: `BUILD_PERSONA_SYSTEM_PROMPT`, `REGEN_EMPATHY_MAP_PROMPT`, `REGEN_PAINS_PROMPT`, `REGEN_DREAMS_PROMPT`, `REGEN_DEEP_NEED_PROMPT`, `GENERATE_FRAME_PROMPT`. Each interpolates framework constants from `src/framework.ts`. JSON-shape constraint in each.
- **`src/ai/persona-generator.ts`** — new file. Workers AI wrapper:
  - `generatePersonaDraft(env, business, hints?, nameHint?) → PersonaPayload` — single `env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", ...)` call routed through AI Gateway (`mcp-production-gateway`, `cacheTtl: 0`).
  - `regenerateDimension(env, persona, dimension) → Partial<PersonaPayload>`.
  - `generateFrame(env, persona, frame_type, product_hook?) → { text, framework_note }`.
  - JSON parse + retry-once + sanitized PL error on second failure.
  - Wraps user input in `<user_input>...</user_input>` tags to suppress prompt injection.

### Block C — Tool handlers + server wiring

- **`src/tools/build_persona.ts`** — exports `buildPersona(env, userId, input) → { text_pl, payload }`. Generates `persona_id`, calls `generatePersonaDraft`, inserts D1 row, returns payload.
- **`src/tools/refine_persona.ts`** — reads persona, applies `delta` (renormalizes 3F to sum 100 if off), runs optional regen AFTER delta applied, writes back, returns full payload.
- **`src/tools/generate_frame.ts`** — reads persona, calls `generateFrame` AI helper, inserts frame, returns frame payload.
- **`src/tools/load_persona.ts`** — branches single vs list mode by `persona_id` presence.
- **`src/tools/export_persona.ts`** — reads persona + frames, renders Markdown (predefined PL template) or JSON, returns `{ content, filename, byte_count }`.
- **`src/tools/index.ts`** — barrel re-export.
- **`src/tools/descriptions.ts`** — fill `TOOL_METADATA` for 5 tools with the 2-part descriptions verbatim from PRP §3.1.
- **`src/server-instructions.ts`** — replace placeholder with PRP §3.8 content verbatim (<300 words, PL note, framework reference).
- **`src/prompts/nowa-persona.ts`** + **`src/prompts/przepisz-z-persona.ts`** — new files. Each exports a `(server: McpServer) => void` that calls `server.registerPrompt(...)` with the spec from PRP §3.5.
- **`src/server.ts`** — extend the scaffold's `createServer(env)`:
  1. Replace the example tool with 5 native `server.registerTool()` calls (annotations + `_meta.ui.resourceUri` + visibility `["app"]` on the 3 widget-driven tools).
  2. Call both prompt registrations.
  3. Resource handler stays as scaffolded — confirm `_meta.ui.csp` is on `contents[]` (per `server-registration.md`) with all 4 fields declared (PRP §3.2: empty `connectDomains`, full `resourceDomains`, empty frame/baseUri).

### Block D — Widget

Mirror `web/widgets/widget.tsx` scaffold pattern, expand into multi-component:

- **`web/widgets/persona.html`** — rename from `widget.html` or add new entry; `<meta name="color-scheme">`, transparent body, single module script.
- **`web/widgets/persona.tsx`** — root component:
  - `new App(name, {}, { autoResize: false })` per `widget-patterns.md`.
  - Register `ontoolresult`, `onerror`, `onhostcontextchanged`, `onteardown` BEFORE `app.connect()`.
  - `connect()` no transport arg → on resolve: `sendSizeChanged({ height: 500 })`.
  - Drives state from `structuredContent` of `build_persona` / `refine_persona` / `generate_frame` results.
  - Fixed `h-[500px]` outer container, Tailwind dark mode.
  - On every persona update calls `app.updateModelContext({ content: [{ type: "text", text: summary }] })`.
- **Sub-components in `web/widgets/components/`:**
  - `Header.tsx` — name/profession bar + export menu.
  - `MaslowPyramid.tsx` — SVG 5-tier pyramid, tier labels from `framework.ts`.
  - `Triangle3F.tsx` — SVG triangle with draggable dot; pure barycentric math in `lib/barycentric.ts`.
  - `MotivationBars.tsx` — 6 horizontal bars, drag-to-set 0–100 independent.
  - `EmpathyGrid.tsx` — 5 textareas in a grid + 🔄 button (regenerates all 5 jointly).
  - `DeepNeedCard.tsx` — text block + 🔄 button.
  - `FrameCard.tsx` + `FrameAddBar.tsx` — frame list + add buttons.
- **`web/widgets/lib/barycentric.ts`** — pure helpers `cartesianToBarycentric` + `barycentricToCartesian`.
- **`web/widgets/lib/debounce.ts`** — small `debounce(fn, ms)` (300ms for slider commits).
- Re-export `framework.ts` constants into the widget bundle (Vite handles cross-tree TS imports — no duplication).

### Reuse from existing code

| Already present in scaffold | Use as-is |
|---|---|
| `src/auth/jwt-verify.ts` + `auth-utils.ts` | Auth layer complete, no changes |
| `src/well-known.ts` | OAuth discovery complete |
| `src/index.ts` | JWT pre-handler + `/mcp` routing complete |
| `src/helpers/assets.ts` (`loadHtml`) | Used by resource handler |
| `src/shared/logger.ts` | Used by tool handlers for `ToolEvent` / `AiEvent` |
| `vite.config.ts`, `package.json` | Build config complete (`cross-env`, `emptyOutDir: false`, `viteSingleFile`) |
| `web/components/ui/` (button, card, badge shadcn stubs) | Used by sub-components |

## Verification

1. `cd projects/persona-empatia && npx tsc --noEmit` after each block (A → B → C → D) — must be clean.
2. `npm run build:widgets` after Block D — must emit a single HTML to `web/dist/widgets/`.
3. `npx wrangler deploy --dry-run` from project root — confirm bindings list: `DB`, `ASSETS`, `AI`, `AUTHKIT_DOMAIN`. Reject if `MCP_OBJECT` or `OAUTH_KV` appears.
4. Apply migration locally for smoke test: `npx wrangler d1 migrations apply mcp-oauth --local` → run `npx wrangler dev` → POST a tool-call JSON-RPC to `http://localhost:8787/mcp` with a fixture JWT (helper exists in skeleton tests) → verify `build_persona` returns a structured persona (Workers AI in local mode may be stubbed; if so, validate non-AI tools `load_persona`, `export_persona` end-to-end).
5. Visual sanity: open `web/dist/widgets/*.html` directly in browser — confirm no console errors at render before tool data arrives (loading state visible).

## Out of scope for this run

- Pushing to GitHub / Workers Builds deployment (per CLAUDE.md, `/smart-push` is the user-driven step).
- Applying D1 migration to `--remote` (local-only is enough for build verification).
- Registering in `repos_mcp.md` / `projects/INDEX.md` (separate ops task).
- Wtyczki.ai panel-side product registration.
