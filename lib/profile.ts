export type ProfileRole = "researcher" | "founder";

export type ProfileLink = {
  label: string;
  url: string;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  contact: string;
  linksRaw: string;
  links: ProfileLink[];
  summary: string;
  role: ProfileRole;
  tags: string[];
};

export type ProfileInput = {
  name?: string;
  email: string;
  contact: string;
  linksRaw: string;
  summary: string;
  role?: ProfileRole;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "in",
  "on",
  "at",
  "of",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "that",
  "this",
  "their",
  "our",
  "your",
  "we",
  "you",
  "they",
  "it",
  "as",
  "by",
  "from",
  "into",
  "about",
  "through",
  "using",
  "based",
  "building",
  "looking",
]);

export function parseLinks(raw: string): ProfileLink[] {
  const tokens = raw
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return tokens.map((token) => {
    const urlMatch = token.match(/https?:\/\/\S+/i);
    const url = urlMatch?.[0] ?? token;
    const label = token
      .replace(url, "")
      .replace(/^[-–—:|]+\s*|\s*[-–—:|]+$/g, "")
      .trim();

    return {
      label: label || hostnameFromUrl(url),
      url: url.startsWith("http") ? url : `https://${url}`,
    };
  });
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

export function extractTags(summary: string, linksRaw: string): string[] {
  const text = `${summary} ${linksRaw}`.toLowerCase();
  const words = text.match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];

  const tags = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word) || word.length < 4) continue;
    tags.add(word);
  }

  return [...tags].slice(0, 12);
}

export function inferRole(summary: string, linksRaw: string): ProfileRole {
  const text = `${summary} ${linksRaw}`.toLowerCase();
  const founderSignals = [
    "startup",
    "founder",
    "ceo",
    "venture",
    "product",
    "go-to-market",
    "pitch",
  ];
  const researcherSignals = [
    "research",
    "phd",
    "professor",
    "lab",
    "publication",
    "paper",
    "university",
    "thesis",
  ];

  const founderScore = founderSignals.filter((s) => text.includes(s)).length;
  const researcherScore = researcherSignals.filter((s) => text.includes(s))
    .length;

  return founderScore >= researcherScore ? "founder" : "researcher";
}

function tokenize(profile: Profile): Set<string> {
  const tokens = new Set<string>();
  for (const tag of profile.tags) tokens.add(tag);
  for (const word of profile.summary.toLowerCase().match(/[a-z0-9][a-z0-9-]{3,}/g) ?? []) {
    if (!STOP_WORDS.has(word)) tokens.add(word);
  }
  return tokens;
}

export type ProfileMatch = {
  profile: Profile;
  score: number;
  sharedTags: string[];
};

export function rankMatches(
  viewer: Profile,
  candidates: Profile[]
): ProfileMatch[] {
  const viewerTokens = tokenize(viewer);

  return candidates
    .filter((candidate) => candidate.id !== viewer.id)
    .map((candidate) => {
      const candidateTokens = tokenize(candidate);
      const sharedTags = [...viewerTokens].filter((tag) =>
        candidateTokens.has(tag)
      );

      const unionSize = new Set([...viewerTokens, ...candidateTokens]).size;
      const overlapScore =
        unionSize === 0 ? 0 : (sharedTags.length / unionSize) * 100;

      const complementaryBonus =
        viewer.role !== candidate.role &&
        sharedTags.length >= 2
          ? 12
          : 0;

      const score = Math.min(
        99,
        Math.round(overlapScore + complementaryBonus)
      );

      return { profile: candidate, score, sharedTags };
    })
    .sort((a, b) => b.score - a.score);
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "New member";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
