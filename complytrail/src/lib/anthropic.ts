import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

export function isPolicyDraftingEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function generatePolicyDraft(params: {
  controlTitle: string;
  controlDescription: string;
  companyName: string;
  answers: Record<string, string>;
}): Promise<string> {
  const anthropic = getClient();

  const questionnaireText = Object.entries(params.answers)
    .map(([question, answer]) => `Q: ${question}\nA: ${answer.trim() || "(not answered)"}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You draft first-pass internal policy documents for early-stage startups preparing for a SOC 2 Type I audit. " +
      "Write in plain, direct language a 5-50 person company would actually use — no legalese. Ground every step " +
      "in what the company described; don't invent specifics they didn't give you, and say so where their answer " +
      "was thin. Output Markdown with a title, a short Purpose section, a Scope section, and a numbered Process " +
      "section. End with a one-line italic note that this is an AI-generated first draft to be reviewed before adoption.",
    messages: [
      {
        role: "user",
        content:
          `Company: ${params.companyName}\n` +
          `SOC 2 control this policy should support: ${params.controlTitle} — ${params.controlDescription}\n\n` +
          `Here's how the company says they currently handle this, from a short questionnaire:\n\n${questionnaireText}\n\n` +
          `Draft the policy document.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
