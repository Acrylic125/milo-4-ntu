"use client";

import type { Profile } from "@/lib/mock-profiles";

export type ProfileInput = {
  name?: string;
  email: string;
  contact: string;
  linksRaw: string;
  workingOn: string;
  role?: Profile["role"];
};

const STORAGE_KEY = "milo-current-profile";

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

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function parseLinks(raw: string): Profile["links"] {
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

function extractTags(workingOn: string, linksRaw: string): string[] {
  const text = `${workingOn} ${linksRaw}`.toLowerCase();
  const words = text.match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];

  const tags = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word) || word.length < 4) continue;
    tags.add(word);
  }

  return [...tags].slice(0, 12);
}

function inferRole(workingOn: string, linksRaw: string): Profile["role"] {
  const text = `${workingOn} ${linksRaw}`.toLowerCase();
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
  const researcherScore = researcherSignals.filter((s) =>
    text.includes(s)
  ).length;

  return founderScore >= researcherScore ? "founder" : "researcher";
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "New member";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCurrentProfile(): Profile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveCurrentProfile(input: ProfileInput): Profile {
  const profile: Profile = {
    id: "me",
    name: input.name?.trim() || displayNameFromEmail(input.email),
    email: input.email.trim(),
    contact: input.contact.trim(),
    linksRaw: input.linksRaw.trim(),
    links: parseLinks(input.linksRaw),
    workingOn: input.workingOn.trim(),
    role: input.role ?? inferRole(input.workingOn, input.linksRaw),
    tags: extractTags(input.workingOn, input.linksRaw),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event("milo-profile-updated"));
  return profile;
}

export function clearCurrentProfile(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
