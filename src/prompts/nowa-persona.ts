/**
 * Prompt: /nowa-persona
 *
 * Guided 30-second onboarding for a new persona. The conversation LLM asks
 * 1–2 short PL questions, then calls `build_persona`.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerNowaPersonaPrompt(server: McpServer): void {
  server.registerPrompt(
    "nowa-persona",
    {
      title: "Stwórz personę copywriterską dla mojego biznesu",
      description:
        "Przeprowadza krótki, ~30-sekundowy wywiad o biznesie użytkownika, a następnie wywołuje narzędzie build_persona, aby otworzyć widget z gotowym draftem persony.",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Pomóż mi stworzyć copywriterską personę. Zadaj mi po polsku 1-2 krótkie pytania:",
              "1. Co sprzedajesz / czym się zajmujesz? (jedno zdanie, np. \"kursy hiszpańskiego online dla pracujących\").",
              "2. Komu? Podaj choć jedną wskazówkę demograficzną LUB kontekstową (np. \"20-40 lat, home office\").",
              "",
              "Po odpowiedziach wywołaj narzędzie `build_persona` z argumentami:",
              "- business: pierwsza odpowiedź",
              "- hints (opcjonalnie): druga odpowiedź, jeśli podana",
              "",
              "Po zwróceniu wyniku otwórz widget i krótko podsumuj wygenerowaną personę (imię, wiek, profesja, dominacja 3F, poziom Maslowa).",
              "",
              "WAŻNE: nie próbuj samodzielnie wymyślać persony w czacie — narzędzie build_persona ma robić pełne wygenerowanie.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
