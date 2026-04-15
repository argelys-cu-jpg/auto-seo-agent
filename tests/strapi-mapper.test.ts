import { describe, expect, it } from "vitest";
import { mapToStrapiData } from "../packages/integrations/src/providers/strapi-mapper";

describe("mapToStrapiData", () => {
  it("maps agent draft payload fields into configurable Strapi fields", () => {
    process.env.ADMIN_EMAIL = "reviewer@cookunity.local";
    process.env.ADMIN_PASSWORD = "password123";
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cookunity_seo_agent";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.STRAPI_BASE_URL = "https://cms.example.com";

    const result = mapToStrapiData({
      title: "Healthy Prepared Meals",
      slug: "healthy-prepared-meals",
      excerpt: "Excerpt",
      body: "<article>Hello</article>",
      metaTitle: "SEO Title",
      metaDescription: "SEO Description",
      tags: ["healthy eating"],
      categories: ["Prepared Meals"],
      schemaJson: { "@type": "Article" },
      status: "draft",
    });

    expect(result.title).toBe("Healthy Prepared Meals");
    expect(result.slug).toBe("healthy-prepared-meals");
    expect(result.body).toBe("<article>Hello</article>");
  });
});
