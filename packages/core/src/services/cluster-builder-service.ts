export interface ClusterAssignment {
  clusterName: string;
  role: "pillar" | "support" | "refresh" | "faq";
  topicKeyword: string;
}

export class ClusterBuilderService {
  build(keywords: string[]): ClusterAssignment[] {
    const groups = new Map<string, string[]>();
    for (const keyword of keywords) {
      const root = keyword.split(" ").slice(0, 2).join(" ");
      groups.set(root, [...(groups.get(root) ?? []), keyword]);
    }

    return [...groups.entries()].flatMap(([clusterName, terms]) =>
      terms.map((topicKeyword, index) => ({
        clusterName,
        role: index === 0 ? "pillar" : topicKeyword.includes("what is") || topicKeyword.includes("how") ? "faq" : "support",
        topicKeyword,
      })),
    );
  }
}
