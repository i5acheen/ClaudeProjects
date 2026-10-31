/** Opt-out keywords (CLAUDE.md §6.2). Matched on the whole trimmed message, case-insensitive. */
const OPT_OUT = ["stop", "unsubscribe", "थांबवा", "बंद करा", "बंद करो", "बंद", "रोको", "मत भेजो", "नको"];
const OPT_IN = ["start", "सुरू करा", "शुरू करो"];

function norm(text: string): string {
  return text.trim().toLowerCase().replace(/[.!।\s]+$/u, "").replace(/\s+/g, " ");
}

export function isOptOut(text: string | null | undefined): boolean {
  return !!text && OPT_OUT.includes(norm(text));
}

export function isOptIn(text: string | null | undefined): boolean {
  return !!text && OPT_IN.includes(norm(text));
}

export const OPT_OUT_CONFIRMATION: Record<"mr" | "hi" | "en", string> = {
  mr: "ठीक आहे जी, आम्ही आता आपल्याला संदेश पाठवणार नाही. पुन्हा सुरू करण्यासाठी START लिहा.",
  hi: "ठीक है जी, हम अब आपको संदेश नहीं भेजेंगे। फिर से शुरू करने के लिए START लिखें।",
  en: "Okay, we will not message you again. Reply START to resume.",
};
