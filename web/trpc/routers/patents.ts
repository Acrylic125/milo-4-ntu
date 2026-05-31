import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { patents, userSearchProfile, users } from "@/db/schema";
import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

type Researcher = {
  id: string;
  name: string;
  role: "student" | "researcher";
};

type PatentListRow = {
  link: string;
  title: string;
  researchers: Researcher[];
};

type PatentRow = {
  link: string;
  title: string;
  researchers: Researcher[];
  similarity: number | null;
  patentMatch: number | null;
  lookingForMatch: number | null;
};

type RawPatentListRow = {
  link: string;
  title: string;
  researchers: Researcher[] | null;
};

type RawRecommendationRow = {
  link: string;
  title: string;
  researchers: Researcher[] | null;
  similarity: string | number | null;
  patent_match: string | number | null;
  looking_for_match: string | number | null;
};

const RESEARCHER_AGG = sql`
  COALESCE(
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id', p.id,
        'name', u.name,
        'role', p.role
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::jsonb
  )
`;

export const patentsRouter = createTRPCRouter({
  /**
   * All patents in the network, grouped by `links` (each unique patent URL
   * collapses its co-inventor rows into a single entry with the full
   * researcher list).
   */
  list: publicProcedure.query(async (): Promise<PatentListRow[]> => {
    const rows = await db.execute<RawPatentListRow>(sql`
      SELECT
        pat.links AS link,
        MAX(pat.title) AS title,
        ${RESEARCHER_AGG} AS researchers
      FROM ${patents} pat
      JOIN ${userSearchProfile} p ON p.user_id = pat.user_id
      JOIN ${users} u ON u.id = pat.user_id
      GROUP BY pat.links
      ORDER BY MAX(pat.title)
    `);

    return Array.from(rows).map((row) => ({
      link: row.link,
      title: row.title,
      researchers: row.researchers ?? [],
    }));
  }),

  /**
   * Embedding-based patent recommendations.
   *
   * For every patent not (co-)owned by the viewer we compute two signals
   * and take the max:
   *
   *   1. `patent_match` — best cosine similarity between this patent's
   *      embedding and any of the viewer's patent embeddings.
   *   2. `looking_for_match` — cosine similarity between this patent's
   *      embedding and the viewer's "what I'm looking for" embedding.
   *
   * Patents with the same `links` (URL) are grouped, so co-invented
   * patents surface once with the full researcher list attached.
   */
  recommendations: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }): Promise<PatentRow[]> => {
      const limit = input?.limit ?? 50;
      const viewerId = await getCurrentProfileIdForUser(ctx.session?.user);
      if (!viewerId) return [];

      const [viewerProfile] = await db
        .select({ userId: userSearchProfile.userId })
        .from(userSearchProfile)
        .where(eq(userSearchProfile.id, viewerId))
        .limit(1);

      if (!viewerProfile?.userId) return [];

      const rows = await db.execute<RawRecommendationRow>(sql`
        WITH candidate_patents AS (
          SELECT cp.id, cp.user_id, cp.title, cp.links, cp.embedding
          FROM ${patents} cp
          WHERE cp.user_id <> ${viewerProfile.userId}
            AND cp.embedding IS NOT NULL
        ),
        patent_pair AS (
          SELECT cp.id AS patent_id,
                 MAX(1 - (cp.embedding <=> vp.embedding)) AS score
          FROM candidate_patents cp
          JOIN ${patents} vp
            ON vp.user_id = ${viewerProfile.userId}
           AND vp.embedding IS NOT NULL
          GROUP BY cp.id
        ),
        looking_for_match AS (
          SELECT cp.id AS patent_id,
                 (1 - (cp.embedding <=> v.looking_for_embedding)) AS score
          FROM candidate_patents cp
          JOIN ${userSearchProfile} v
            ON v.id = ${viewerId}
           AND v.looking_for_embedding IS NOT NULL
        )
        SELECT
          cp.links AS link,
          MAX(cp.title) AS title,
          ${RESEARCHER_AGG} AS researchers,
          MAX(pp.score) AS patent_match,
          MAX(lf.score) AS looking_for_match,
          GREATEST(
            COALESCE(MAX(pp.score), -1),
            COALESCE(MAX(lf.score), -1)
          ) AS similarity
        FROM candidate_patents cp
        JOIN ${userSearchProfile} p ON p.user_id = cp.user_id
        JOIN ${users} u ON u.id = cp.user_id
        LEFT JOIN patent_pair pp ON pp.patent_id = cp.id
        LEFT JOIN looking_for_match lf ON lf.patent_id = cp.id
        GROUP BY cp.links
        HAVING GREATEST(
          COALESCE(MAX(pp.score), -1),
          COALESCE(MAX(lf.score), -1)
        ) > -1
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return Array.from(rows).map((row) => ({
        link: row.link,
        title: row.title,
        researchers: row.researchers ?? [],
        similarity: row.similarity == null ? null : Number(row.similarity),
        patentMatch: row.patent_match == null ? null : Number(row.patent_match),
        lookingForMatch:
          row.looking_for_match == null ? null : Number(row.looking_for_match),
      }));
    }),
});
