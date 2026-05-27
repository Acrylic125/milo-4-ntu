import "server-only";

import * as cheerio from "cheerio";

import { NTU_TECH_OFFER_PREFIX } from "@/lib/onboard-schema";

export type ScrapedTechOffer = {
  url: string;
  title: string;
  synopsis: string;
  opportunity: string;
  technology: string;
  applications: string;
  inventors: string[];
};

type SectionKey = "opportunity" | "technology" | "applications";

const SECTION_MATCHERS: Array<{ key: SectionKey; test: (heading: string) => boolean }> = [
  { key: "opportunity", test: (h) => h.startsWith("opportunity") },
  { key: "technology", test: (h) => h.startsWith("technology") },
  { key: "applications", test: (h) => h.startsWith("applications") },
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractTitle($: cheerio.CheerioAPI): string {
  const raw = $("title").first().text();
  if (!raw) return "Untitled";
  const [first] = raw.split("|");
  return normalizeWhitespace(first ?? "Untitled") || "Untitled";
}

function extractSynopsis($: cheerio.CheerioAPI): string {
  return normalizeWhitespace($("h3.techportal-detail__overview").first().text());
}

function extractInventors($: cheerio.CheerioAPI): string[] {
  const names = new Set<string>();

  $("h2.az-listing__group-title").each((_, heading) => {
    if (normalizeWhitespace($(heading).text()).toLowerCase() !== "inventor") {
      return;
    }

    // Inventor cards live in the section/parent that owns this heading. Walk
    // siblings until the next group title to stay inside the right block.
    const $heading = $(heading);
    const $scope = $heading.parent().length ? $heading.parent() : $heading;

    $scope.find("h3.contact-widget__title").each((_, el) => {
      const name = normalizeWhitespace($(el).text());
      if (name) names.add(name);
    });
  });

  return Array.from(names);
}

function extractSections($: cheerio.CheerioAPI): Record<SectionKey, string> {
  const sections: Record<SectionKey, string> = {
    opportunity: "",
    technology: "",
    applications: "",
  };

  $("div.rte").first().find("h2").each((_, el) => {
    const heading = normalizeWhitespace($(el).text()).toLowerCase();
    const matcher = SECTION_MATCHERS.find((m) => m.test(heading));
    if (!matcher) return;

    const body = $(el)
      .nextUntil("h2")
      .toArray()
      .map((node) => $(node).text())
      .join(" ");

    sections[matcher.key] = normalizeWhitespace(body);
  });

  return sections;
}

export async function scrapeNtuTechOffer(url: string): Promise<ScrapedTechOffer> {
  if (!url.startsWith(NTU_TECH_OFFER_PREFIX)) {
    throw new Error(`URL must start with ${NTU_TECH_OFFER_PREFIX}: ${url}`);
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MiloOnboardBot/1.0; +https://milo.ntu.edu.sg)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${res.status} ${res.statusText}`
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const sections = extractSections($);

  return {
    url,
    title: extractTitle($),
    synopsis: extractSynopsis($),
    opportunity: sections.opportunity,
    technology: sections.technology,
    applications: sections.applications,
    inventors: extractInventors($),
  };
}
