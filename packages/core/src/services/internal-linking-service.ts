export interface PublishedInventoryItem {
  id: string;
  title: string;
  url: string;
  cluster: string;
  businessPriority: number;
}

export class InternalLinkingService {
  recommend(
    topicKeyword: string,
    inventory: PublishedInventoryItem[],
  ): Array<{ targetId: string; targetUrl: string; anchorText: string; rationale: string }> {
    const tokens = new Set(topicKeyword.toLowerCase().split(/\W+/).filter(Boolean));

    return inventory
      .map((item) => {
        const overlap = item.title
          .toLowerCase()
          .split(/\W+/)
          .filter((token) => tokens.has(token)).length;

        return {
          targetId: item.id,
          targetUrl: item.url,
          anchorText: overlap >= 2 ? item.title.toLowerCase() : "prepared meal delivery",
          rationale:
            overlap >= 2
              ? "High semantic overlap and likely cluster fit."
              : "Business-priority page that helps route users toward consideration content.",
          score: overlap * 10 + item.businessPriority,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map(({ score: _score, ...rest }) => rest);
  }
}
