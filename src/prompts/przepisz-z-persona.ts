/**
 * Prompt: /przepisz-z-persona
 *
 * Rewrites a pasted copy snippet using a loaded persona as constraint set.
 * Reflection runs entirely on the user's LLM — zero Workers AI cost.
 */

import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrzepiszZPersonaPrompt(server: McpServer): void {
  server.registerPrompt(
    "przepisz-z-persona",
    {
      title: "Przepisz mój tekst pod konkretną personę",
      description:
        "Korzysta z LLM użytkownika (nie Workers AI) do przepisania wklejonego copy z osadzeniem w konkretnej, wcześniej zapisanej personie. Zwraca: 2 elementy frameworku zignorowane przez oryginał, propozycję rewrite, listę 'słów-wytrychów' do usunięcia.",
      argsSchema: {
        persona_id: z.string()
          .min(20)
          .max(40)
          .meta({ description: "ID wcześniej zapisanej persony, pod którą przepisać copy." }),
        copy: z.string()
          .min(10)
          .max(1000)
          .meta({ description: "Oryginalny tekst copy (≤1000 znaków)." }),
      },
    },
    async (args) => {
      const personaId = (args as { persona_id: string; copy: string }).persona_id;
      const copy = (args as { persona_id: string; copy: string }).copy;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Najpierw wywołaj \`load_persona({ persona_id: "${personaId}" })\` żeby wczytać personę.`,
                "",
                "Następnie po polsku:",
                "1. Wskaż 2 elementy frameworku (mapa empatii / 3F / Maslow / dlaczego dziś), które oryginalny tekst IGNORUJE.",
                "2. Zaproponuj rewrite (2-4 zdania, sensoryczny, BEZ słów-wytrychów jak: luksus, prestiż, innowacyjny, wygoda, nowoczesny).",
                "3. Wymień słowa-wytrychy z oryginału, jeśli były.",
                "",
                "Oryginalne copy do przepisania:",
                "```",
                copy,
                "```",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );
}
