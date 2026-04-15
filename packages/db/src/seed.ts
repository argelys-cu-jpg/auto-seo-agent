import { prisma } from "./client";
import { mockBrief, mockDraft, mockOptimizationTask, mockTopicCandidates } from "@cookunity-seo-agent/shared";

async function main(): Promise<void> {
  const firstTopic = mockTopicCandidates[0];
  if (!firstTopic) {
    throw new Error("No mock topic candidates available for seeding.");
  }

  for (const topic of mockTopicCandidates) {
    await prisma.topicCandidate.upsert({
      where: { normalizedKeyword: topic.normalizedKeyword },
      update: {
        title: topic.keyword,
        source: topic.source,
        workflowState: topic.status,
        recommendation: topic.recommendation,
        totalScore: 78,
        scoreBreakdownJson: topic,
        rationale: topic.explanation,
        businessValueNotes: "Seeded mock topic",
        cannibalizationRisk: topic.relatedExistingContentIds.length > 0 ? 25 : 8,
      },
      create: {
        title: topic.keyword,
        normalizedKeyword: topic.normalizedKeyword,
        source: topic.source,
        workflowState: topic.status,
        recommendation: topic.recommendation,
        totalScore: 78,
        scoreBreakdownJson: topic,
        rationale: topic.explanation,
        businessValueNotes: "Seeded mock topic",
        cannibalizationRisk: topic.relatedExistingContentIds.length > 0 ? 25 : 8,
      },
    });
  }

  const topic = await prisma.topicCandidate.findFirstOrThrow({
    where: { normalizedKeyword: firstTopic.normalizedKeyword },
  });

  const brief = await prisma.contentBrief.create({
    data: {
      topicCandidateId: topic.id,
      promptVersionId: "outline_generation:v1",
      primaryKeyword: mockBrief.primaryKeyword,
      secondaryKeywordsJson: mockBrief.secondaryKeywords,
      briefJson: mockBrief,
    },
  });

  const draft = await prisma.draft.create({
    data: {
      topicCandidateId: topic.id,
      briefId: brief.id,
      promptVersionId: mockDraft.promptVersionId,
      draftJson: mockDraft,
      html: mockDraft.html,
      markdown: "Seeded mock markdown",
    },
  });

  const publication = await prisma.publication.create({
    data: {
      topicCandidateId: topic.id,
      draftId: draft.id,
      strapiEntryId: "mock_healthy-prepared-meal-delivery-guide",
      strapiDocumentId: "doc_healthy-prepared-meal-delivery-guide",
      slug: mockDraft.slugRecommendation,
      status: "published",
      metadataJson: {
        titleTag: mockDraft.titleTagOptions[0],
        metaDescription: mockDraft.metaDescriptionOptions[0],
      },
      fieldMappingJson: {
        title: "title",
        slug: "slug",
        body: "body",
      },
      publishedAt: new Date(),
    },
  });

  await prisma.optimizationRecommendation.create({
    data: {
      topicCandidateId: topic.id,
      publicationId: publication.id,
      type: mockOptimizationTask.type,
      priority: mockOptimizationTask.priority,
      reason: mockOptimizationTask.reason,
      recommendationJson: mockOptimizationTask,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
