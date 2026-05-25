---
Created: 2026-05-23
Updated: 2026-05-23
---

# Eval Report — persona-empatia

**Server:** https://persona-empatia.wtyczki.ai/mcp
**Model:** openai/gpt-5.4-mini
**Iterations:** 3 per scenario
**Run:** 2026-05-23 23:07 GMT+2
**Overall accuracy:** **8/8 scenarios at 100%** (24/24 iterations). Avg accuracy: 1.00.

Surface introspected: **5 tools** (`build_persona`, `refine_persona`, `generate_frame`, `load_persona`, `export_persona`), **1 widget resource** (`ui://persona-empatia/widget`), **2 prompts** (`nowa-persona`, `przepisz-z-persona`), **server instructions: 2675 chars** (well-populated, PL-only, with Usage Patterns + routing rules).

## Summary table

| Scenario | Type | Tool target | Iter | Accuracy | Avg tokens |
|----------|------|-------------|------|----------|-----------:|
| happy — build_persona from business + hints | happy | `build_persona` | 3 | 3/3 (100%) | 3 573 |
| happy — load_persona list mode (no args) | happy | `load_persona` | 3 | 3/3 (100%) | 3 583 |
| happy — generate_frame aspirational with persona_id | happy | `generate_frame` | 3 | 3/3 (100%) | 3 414 |
| happy — refine_persona age delta from NL | happy | `refine_persona` | 3 | 3/3 (100%) | 3 401 |
| happy — export_persona markdown | happy | `export_persona` | 3 | 3/3 (100%) | 3 391 |
| multi-turn — build_persona → generate_frame (pain) | multi-turn | `build_persona`, `generate_frame` | 3 | 3/3 (100%) | 9 156 |
| negative — documentation question (framework explainer) | negative | (none expected) | 3 | 3/3 (100%) | 2 617 |
| negative — vague non-actionable musing | negative | (none expected) | 3 | 3/3 (100%) | 1 729 |

## Failures (accuracy < 100%)

**None.** Every scenario passed every iteration.

## Tool-error notes (non-failures, but worth flagging)

Three scenarios (`generate_frame`, `refine_persona`, `export_persona` happy paths) used a **fake `persona_id`** (`persona_01HW2K3M4N5P6Q7R`) in the prompt to test tool-selection in isolation. The server correctly returned:

> `Nie znaleziono persony o podanym ID.`

This is **expected and correct behavior** — `load_persona`'s description promises *"unknown persona_id returns a graceful 'not found' (not an error)"*, and the other ID-consuming tools follow suit. The matchers confirmed the LLM picked the right tool with the right discriminating args (`frame_type: "aspirational"`, `delta.age: 35`, `format: "markdown"`); the server's rejection is unrelated to LLM understanding.

**Action: none.** If the server returns these as `isError:true` rather than as plain text with `next_steps`, that is a deliberate UX choice — surfaceable to the LLM as "this persona doesn't exist, ask the user which one they meant." No code change recommended.

## Recommendations

**None of high impact.** The server's tool descriptions, server instructions, and disambiguation are all working as intended at this model tier. Specifically:

1. **Server instructions paying off** — the explicit *Usage Patterns* block (`"Always call build_persona to create a fresh persona…"`, `"For follow-up sessions, call load_persona (no args = list mode)"`) clearly steers the LLM through both single-turn and multi-turn flows without leakage to wrong tools. Reference: `guides/server_instruction_guide.md` §"Template for wtyczki.ai Servers" — this is a textbook implementation.

2. **Tool descriptions are crisp** — the 2-part pattern (verb + resource, then *"Use when…"* + *"Note:"*) prevents over-eager firing on negative tests. Both negatives (informational + vague) scored 3/3 with zero false positives. Reference: `guides/tool_description_guide.md` §"When to Add a Second Sentence" point 3 (Hard rejection) — exemplified here.

3. **`refine_persona` natural-language delta extraction works** — the LLM correctly emitted `{ delta: { age: 35 } }` from `"Zmień wiek persony … na 35 lat"` in all 3 iterations. The `description` field for `delta` (*"Any subset of persona fields to overwrite"*) plus the inline example in the tool description (*"zmień Małgosi wiek na 35"*) are doing real work. Keep them.

4. **Optional polish (low impact):** consider replacing the `isError:true` "not found" response on `generate_frame` / `refine_persona` / `export_persona` with the same graceful pattern `load_persona` uses (plain text + `next_steps` hinting the user to list personas first). Today the LLM only sees `isError:true` — a `next_steps` hint would let the agent self-recover. Reference: `production_docs/MCP_DESIGN_BEST_PRACTICES.md §6 Instructional Feedback`.

5. **Consider expanding eval coverage in a future pass:**
   - Edge test for `refine_persona` 3F triangle renormalization (e.g. `triangle_3f: { fuck: 80, food: 80, friends: 80 }` — server should normalize to 100).
   - Disambiguation test: *"przywołaj Małgosię"* vs *"stwórz nową personę"* — confirms `load_persona` vs `build_persona` boundary is sharp.
   - A `/przepisz-z-persona` prompt-driven scenario (currently no MCP tool fires — copy is reflected via the user's own LLM — so this would be a `toolsCalled().length === 0` test, not a positive call).

## Verdict

**Ship-ready from an LLM tool-selection standpoint.** No description rewrites needed, no `outputSchema` issues observed (no F1-style errors that pass silently), no server-instruction gaps. The 2675-char instructions block plus per-tool *"Use when…"* clauses are doing exactly what `production_docs/MCP_DESIGN_BEST_PRACTICES.md` recommends.

## Forensics

- `doctor.json` — MCP surface snapshot at run time
- `vitest-results.json` — vitest JSON reporter output (per-test timing/status)
- `eval-summary.json` — per-scenario accuracy, avg tokens, tool-error capture
- Eval test source: `mcp-evals/persona-empatia/persona-empatia.eval.test.ts`

## Changelog

- 2026-05-23 — Initial eval report. 8 scenarios (5 happy + 1 multi-turn + 2 negative) × 3 iterations = 24 runs. All passed.
