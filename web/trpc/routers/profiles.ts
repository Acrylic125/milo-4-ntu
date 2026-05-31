import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { patents, userSearchProfile, users } from "@/db/schema";
import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

const profileColumns = {
  id: userSearchProfile.id,
  userId: userSearchProfile.userId,
  name: users.name,
  email: users.email,
  role: userSearchProfile.role,
  tags: userSearchProfile.tags,
  lookingFor: userSearchProfile.lookingFor,
} as const;

type RecommendationRow = {
  id: string;
  name: string;
  email: string;
  role: "student" | "researcher";
  tags: string[] | null;
  similarity: string | number;
  patent_match: string | number | null;
  looking_for_match: string | number | null;
  patent_count: string | number;
};

export const profilesRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return db
      .select(profileColumns)
      .from(userSearchProfile)
      .innerJoin(users, eq(userSearchProfile.userId, users.id))
      .orderBy(users.name);
  }),

  current: publicProcedure.query(async ({ ctx }) => {
    const id = await getCurrentProfileIdForUser(ctx.session?.user);
    if (!id) return null;
    const [row] = await db
      .select(profileColumns)
      .from(userSearchProfile)
      .innerJoin(users, eq(userSearchProfile.userId, users.id))
      .where(eq(userSearchProfile.id, id))
      .limit(1);
    return row ?? null;
  }),

  /**
   * Embedding-based recommendations.
   *
   * For every other profile we compute two similarity signals and take the
   * max:
   *
   *   1. `patent_match` — best cosine similarity between any pair of (their
   *      patent, viewer's patent) embeddings.
   *   2. `looking_for_match` — best cosine similarity between the viewer's
   *      "what I'm looking for" embedding and any of their patent embeddings.
   *
   * `similarity = max(patent_match, looking_for_match)` so a candidate can
   * surface either because their patents overlap with the viewer's patents
   * or because their patents align with what the viewer is currently
   * looking for.
   *
   * Candidates without patents are excluded (nothing to compare against).
   */
  recommendations: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const viewerId = await getCurrentProfileIdForUser(ctx.session?.user);
      if (!viewerId) return [];

      const rows = await db.execute<RecommendationRow>(sql`
        WITH viewer AS (
          SELECT user_id, looking_for_embedding
          FROM ${userSearchProfile}
          WHERE id = ${viewerId}
        ),
        candidate_patents AS (
          SELECT cp.id, usp.id AS profile_id, cp.user_id, cp.embedding
          FROM ${patents} cp
          JOIN ${userSearchProfile} usp ON usp.user_id = cp.user_id
          CROSS JOIN viewer v
          WHERE cp.user_id <> v.user_id
            AND cp.embedding IS NOT NULL
        ),
        patent_pair AS (
          SELECT cp.profile_id,
                 MAX(1 - (cp.embedding <=> vp.embedding)) AS score
          FROM candidate_patents cp
          JOIN ${patents} vp
            ON vp.user_id = (SELECT user_id FROM viewer)
           AND vp.embedding IS NOT NULL
          GROUP BY cp.profile_id
        ),
        looking_for_match AS (
          SELECT cp.profile_id,
                 MAX(1 - (cp.embedding <=> v.looking_for_embedding)) AS score
          FROM candidate_patents cp
          CROSS JOIN viewer v
          WHERE v.looking_for_embedding IS NOT NULL
          GROUP BY cp.profile_id
        ),
        patent_counts AS (
          SELECT profile_id, COUNT(DISTINCT id) AS patent_count
          FROM candidate_patents
          GROUP BY profile_id
        )
        SELECT
          p.id,
          u.name,
          u.email,
          p.role,
          p.tags,
          pp.score AS patent_match,
          lf.score AS looking_for_match,
          GREATEST(
            COALESCE(pp.score, -1),
            COALESCE(lf.score, -1)
          ) AS similarity,
          COALESCE(pc.patent_count, 0) AS patent_count
        FROM ${userSearchProfile} p
        JOIN ${users} u ON u.id = p.user_id
        INNER JOIN patent_counts pc ON pc.profile_id = p.id
        LEFT JOIN patent_pair pp ON pp.profile_id = p.id
        LEFT JOIN looking_for_match lf ON lf.profile_id = p.id
        WHERE GREATEST(
          COALESCE(pp.score, -1),
          COALESCE(lf.score, -1)
        ) > -1
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return Array.from(rows).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        tags: row.tags ?? [],
        similarity: Number(row.similarity),
        patentMatch: row.patent_match == null ? null : Number(row.patent_match),
        lookingForMatch:
          row.looking_for_match == null ? null : Number(row.looking_for_match),
        patentCount: Number(row.patent_count),
      }));
    }),
});
