import "server-only";

const DEFAULT_BACKEND_URL = "http://localhost:8002";

export type EmbedInput = {
  synopsis: string;
  opportunity: string;
  technology: string;
  applications: string;
};

export type EmbedResponse = {
  embedding: number[];
  synopsis_embedding: number[];
  opportunity_embedding: number[];
  technology_embedding: number[];
  applications_embedding: number[];
};

function backendUrl(): string {
  return process.env.EMBEDDING_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

export async function embedTechOffer(input: EmbedInput): Promise<EmbedResponse> {
  const res = await fetch(`${backendUrl()}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Embedding service responded ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as Partial<EmbedResponse>;
  if (!Array.isArray(data.embedding)) {
    throw new Error("Embedding service returned no `embedding` array");
  }
  return data as EmbedResponse;
}
