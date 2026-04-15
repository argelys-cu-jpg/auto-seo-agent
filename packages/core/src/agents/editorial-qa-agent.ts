import type { EditorialQaInput, EditorialQaOutput } from "@cookunity-seo-agent/shared";
import { loadBrandVoice } from "@cookunity-seo-agent/prompts";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";

const bannedPhrases = ["revolutionary", "life-changing", "miracle", "cure", "best ever"];

export class EditorialQaAgent extends BaseWorkflowAgent<EditorialQaInput, EditorialQaOutput> {
  readonly name = "editorial_qa" as const;

  constructor() {
    super("editorial_qa:v1");
  }

  protected async run(
    input: EditorialQaInput,
    _context: AgentContext,
  ): Promise<EditorialQaOutput> {
    const voice = loadBrandVoice().toLowerCase();
    const html = input.draft.html.toLowerCase();
    const flags: string[] = [];

    for (const phrase of bannedPhrases) {
      if (html.includes(phrase)) {
        flags.push(`Contains banned phrase: ${phrase}`);
      }
    }

    if (input.draft.targetKeywords.length > 12) {
      flags.push("High target keyword count may indicate stuffing risk.");
    }

    if (input.brief.primaryKeyword.includes("weight loss")) {
      flags.push("YMYL-adjacent topic detected. Extra human review required.");
    }

    if (!voice.includes("chef-driven prepared meal delivery")) {
      flags.push("Brand voice file appears incomplete.");
    }

    return {
      passed: flags.length === 0,
      flags,
      requiresHumanReview: true,
      normalizedDraft: input.draft,
    };
  }
}
