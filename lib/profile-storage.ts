"use client";

import type { Profile, ProfileInput } from "@/lib/profile";
import {
  displayNameFromEmail,
  extractTags,
  inferRole,
  parseLinks,
} from "@/lib/profile";

const STORAGE_KEY = "milo-current-profile";

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
    summary: input.summary.trim(),
    role: input.role ?? inferRole(input.summary, input.linksRaw),
    tags: extractTags(input.summary, input.linksRaw),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event("milo-profile-updated"));
  return profile;
}

export function clearCurrentProfile(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
