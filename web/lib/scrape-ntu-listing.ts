import "server-only";

import { NTU_TECH_OFFER_PREFIX } from "@/lib/onboard-schema";

const LISTING_ENDPOINT =
  "https://www.ntu.edu.sg/innovates/tech-portal/tech-offers/GetTechPortalServices/";

const USER_AGENT =
  "Mozilla/5.0 (compatible; MiloSeedBot/1.0; +https://milo.ntu.edu.sg)";

const DEFAULT_PARAMS: Record<string, string> = {
  listingKeyword: "",
  sort: "latest",
  category: "all",
  inventorsPI: "all",
  techReadinessLevel: "1 and above",
};

export type ListingItem = {
  title: string;
  url: string;
};

type ListingApiItem = Partial<{
  title: string;
  url: string;
}> & Record<string, unknown>;

type ListingApiResponse = {
  totalPages: number;
  totalItems: number;
  items: ListingApiItem[];
};

function buildListingUrl(page: number): string {
  const params = new URLSearchParams({ ...DEFAULT_PARAMS, page: String(page) });
  return `${LISTING_ENDPOINT}?${params.toString()}`;
}

export async function fetchListingPage(page: number): Promise<{
  totalPages: number;
  totalItems: number;
  items: ListingItem[];
}> {
  const url = buildListingUrl(page);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `NTU listing page ${page} failed: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as ListingApiResponse;
  const items: ListingItem[] = (data.items ?? [])
    .map((item) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      url: typeof item.url === "string" ? item.url.trim() : "",
    }))
    .filter(
      (item) =>
        item.url.length > 0 &&
        item.url.startsWith(NTU_TECH_OFFER_PREFIX) &&
        item.title.length > 0
    );

  return {
    totalPages: Number(data.totalPages ?? 0),
    totalItems: Number(data.totalItems ?? items.length),
    items,
  };
}

/**
 * Walks the listing endpoint page-by-page until every page has been visited
 * (or no more items are returned), de-duplicating detail URLs along the way.
 */
export async function collectAllListingUrls(
  onProgress?: (info: {
    page: number;
    totalPages: number;
    pageItems: number;
    totalCollected: number;
  }) => void
): Promise<ListingItem[]> {
  const seen = new Set<string>();
  const collected: ListingItem[] = [];

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { items, totalPages: reportedPages } = await fetchListingPage(page);
    totalPages = Math.max(totalPages, reportedPages);

    let added = 0;
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      collected.push(item);
      added += 1;
    }

    onProgress?.({
      page,
      totalPages,
      pageItems: added,
      totalCollected: collected.length,
    });

    // Defensive break: empty page means we're past the real end even if
    // the API still claims more pages exist.
    if (items.length === 0) break;

    page += 1;
  }

  return collected;
}
