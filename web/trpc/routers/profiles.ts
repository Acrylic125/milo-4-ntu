import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { patents, profiles } from "@/db/schema";
import { getAssumedUserId } from "@/lib/auth-cookie";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

const profileColumns = {
  id: profiles.id,
  name: profiles.name,
  email: profiles.email,
  contact: profiles.contact,
  role: profiles.role,
  tags: profiles.tags,
} as const;

type RecommendationRow = {
  id: string;
  name: string;
  email: string;
  contact: string;
  role: "researcher" | "founder";
  tags: string[] | null;
  similarity: string | number;
  patent_count: string | number;
};

export const profilesRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return db.select(profileColumns).from(profiles).orderBy(profiles.name);
  }),

  current: publicProcedure.query(async () => {
    const id = await getAssumedUserId();
    if (!id) return null;
    const [row] = await db
      .select(profileColumns)
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    return row ?? null;
  }),

  /**
   * Embedding-based recommendations.
   *
   * For every other profile, we compute the smallest cosine distance between any
   * of their patents and any of the viewer's patents (i.e. the best match),
   * then sort ascending by distance (= descending by similarity).
   *
   * Returns an empty array when there's no assumed user or no overlapping
   * embeddings to compare.
   */
  recommendations: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const viewerId = await getAssumedUserId();
      if (!viewerId) return [];

      const rows = await db.execute<RecommendationRow>(sql`
        SELECT
          p.id,
          p.name,
          p.email,
          p.contact,
          p.role,
          p.tags,
          1 - MIN(cp.embedding <=> vp.embedding) AS similarity,
          COUNT(DISTINCT cp.id) AS patent_count
        FROM ${patents} AS cp
        INNER JOIN ${profiles} AS p ON p.id = cp.profile_id
        INNER JOIN ${patents} AS vp ON vp.profile_id = ${viewerId}
        WHERE cp.profile_id <> ${viewerId}
          AND cp.embedding IS NOT NULL
          AND vp.embedding IS NOT NULL
        GROUP BY p.id, p.name, p.email, p.contact, p.role, p.tags
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return Array.from(rows).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        contact: row.contact,
        role: row.role,
        tags: row.tags ?? [],
        similarity: Number(row.similarity),
        patentCount: Number(row.patent_count),
      }));
    }),
});
