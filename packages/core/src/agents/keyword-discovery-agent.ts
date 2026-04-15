import type { KeywordDiscoveryInput, KeywordDiscoveryOutput } from "@cookunity-seo-agent/shared";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";
import { KeywordIntelligenceService } from "../services/keyword-intelligence-service";

export class KeywordDiscoveryAgent extends BaseWorkflowAgent<
  KeywordDiscoveryInput,
  KeywordDiscoveryOutput
> {
  readonly name = "keyword_discovery" as const;
  private readonly service = new KeywordIntelligenceService();

  constructor() {
    super("keyword_cluster:v1");
  }

  protected async run(
    input: KeywordDiscoveryInput,
    _context: AgentContext,
  ): Promise<KeywordDiscoveryOutput> {
    const candidates = await this.service.discover(input.seedTerms);
    return { candidates };
  }
}
