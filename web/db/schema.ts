import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// sentence-transformers/all-MiniLM-L6-v2 (see backend/app.py) emits 384-dim vectors.
const EMBEDDING_DIM = 384;

export type ProfileLink = {
  label: string;
  url: string;
};

export const profileRoleEnum = pgEnum("profile_role", [
  "researcher",
  "founder",
]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    contact: text("contact").notNull(),

    workingOn: text("working_on").default(""),
    workingOnEmbedding: vector("working_on_embedding", {
      dimensions: EMBEDDING_DIM,
    }),

    role: profileRoleEnum("role").notNull().default("researcher"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("profiles_email_idx").on(table.email),
    index("profiles_role_idx").on(table.role),
  ]
);

export const patents = pgTable(
  "patents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").references(() => profiles.id),
    title: text("title").notNull(),
    links: text("links").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // HNSW + cosine distance for nearest-neighbour search on the combined embedding.
    index("profiles_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
