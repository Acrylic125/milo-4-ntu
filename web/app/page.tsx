import { GetStarted } from "@/components/get-started";
import { Patents, SearchBar } from "@/components/home-page";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { patents, userSearchProfile, users } from "@/db/schema";
import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { getSession } from "@/lib/session";
import { sql } from "drizzle-orm";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type PatentResultRow = {
  link: string;
  title: string;
  researchers: Array<{
    id: string;
    name: string;
    role: "student" | "researcher";
  }> | null;
  similarity: string | number | null;
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

async function RecommendedPatents({
  search,
  profileId,
}: {
  search: string;
  profileId: string;
}) {
  const trimmedSearch = search.trim();

  const [viewerProfile] = await db
    .select({ userId: userSearchProfile.userId })
    .from(userSearchProfile)
    .where(sql`${userSearchProfile.id} = ${profileId}`)
    .limit(1);

  if (!viewerProfile?.userId) {
    return <Patents patents={[]} />;
  }

  const searchFilter = trimmedSearch
    ? sql`AND (
        cp.title ILIKE ${`%${trimmedSearch}%`}
        OR cp.links ILIKE ${`%${trimmedSearch}%`}
        OR u.name ILIKE ${`%${trimmedSearch}%`}
      )`
    : sql``;
  const managedPatentFilter = trimmedSearch
    ? sql``
    : sql`AND cp.links NOT IN (
        SELECT vp.links
        FROM ${patents} vp
        WHERE vp.user_id = ${viewerProfile.userId}
      )`;

  const rows = await db.execute<PatentResultRow>(sql`
    WITH candidate_patents AS (
      SELECT cp.id, cp.user_id, cp.title, cp.links, cp.embedding
      FROM ${patents} cp
      WHERE cp.user_id <> ${viewerProfile.userId}
        AND cp.embedding IS NOT NULL
        ${managedPatentFilter}
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
        ON v.id = ${profileId}
      AND v.looking_for_embedding IS NOT NULL
    )
    SELECT
      cp.links AS link,
      MAX(cp.title) AS title,
      ${RESEARCHER_AGG} AS researchers,
      GREATEST(
        COALESCE(MAX(pp.score), -1),
        COALESCE(MAX(lf.score), -1)
      ) AS similarity
    FROM candidate_patents cp
    JOIN ${userSearchProfile} p ON p.user_id = cp.user_id
    JOIN ${users} u ON u.id = cp.user_id
    LEFT JOIN patent_pair pp ON pp.patent_id = cp.id
    LEFT JOIN looking_for_match lf ON lf.patent_id = cp.id
    WHERE 1 = 1
    ${searchFilter}
    GROUP BY cp.links
    HAVING GREATEST(
      COALESCE(MAX(pp.score), -1),
      COALESCE(MAX(lf.score), -1)
    ) > -1
    ORDER BY similarity DESC
    LIMIT 100
  `);

  const results = Array.from(rows).map((row) => ({
    link: row.link,
    title: row.title,
    researchers: row.researchers ?? [],
    similarity: row.similarity == null ? null : Number(row.similarity),
  }));

  return <Patents patents={results} />;
}

function PatentsSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Skeleton className="h-8 w-36" />
      <div className="border">
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function PatentsContent({
  search,
  profileId,
}: {
  search: string;
  profileId: string;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-ui px-4 sm:px-6">
        <div className="sticky top-16 z-40 mx-auto w-full max-w-1/2 md:top-18">
          <SearchBar />
        </div>
        <div className="pt-4">
          <Suspense fallback={<PatentsSkeleton />}>
            <RecommendedPatents search={search} profileId={profileId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getSession();
  const currentProfileId = await getCurrentProfileIdForUser(session?.user);

  if (session?.user && !currentProfileId) {
    redirect("/onboard");
  }

  if (currentProfileId) {
    return (
      <PatentsContent
        search={resolvedSearchParams.search?.trim() ?? ""}
        profileId={currentProfileId}
      />
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col lg:flex-row w-full max-w-ui lg:h-[calc(100svh-3.5rem)] py-8 gap-8">
        <div className="flex-2 flex flex-col gap-4 md:gap-6 justify-center px-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold text-center lg:text-left">
            MILO <br />
            FOR NTU
          </h1>
          <div className="flex justify-center lg:justify-start">
            <GetStarted
              className="w-fit h-fit md:h-fit py-2 px-4 lg:py-4 lg:px-6 text-xl"
              size="lg"
            />
          </div>
        </div>
        <div className="flex-3 h-full flex flex-col justify-center px-8 relative min-h-72">
          <Image
            src="/hero-dark.png"
            alt="Milo for NTU"
            fill
            className="object-contain hidden dark:block"
          />
          <Image
            src="/hero-light.png"
            alt="Milo for NTU"
            fill
            className="object-contain dark:hidden"
          />
        </div>
      </div>
    </div>
  );
}
