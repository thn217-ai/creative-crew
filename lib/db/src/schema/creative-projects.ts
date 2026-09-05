import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creativeProjectsTable = pgTable(
  "creative_projects",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    accountUserId: text("account_user_id"),
    brief: text("brief").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("creative_projects_account_user_id_idx").on(table.accountUserId),
  ],
);

export const creativeTreatmentsTable = pgTable("creative_treatments", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => creativeProjectsTable.id, { onDelete: "cascade" }),
  treatment: jsonb("treatment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adkSessionsTable = pgTable("adk_sessions", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => creativeProjectsTable.id, { onDelete: "cascade" }),
  adkUserId: text("adk_user_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCreativeProjectSchema = createInsertSchema(
  creativeProjectsTable,
).omit({ createdAt: true, updatedAt: true });
export const insertCreativeTreatmentSchema = createInsertSchema(
  creativeTreatmentsTable,
).omit({ createdAt: true });
export const insertAdkSessionSchema = createInsertSchema(adkSessionsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertCreativeProject = z.infer<
  typeof insertCreativeProjectSchema
>;
export type InsertCreativeTreatment = z.infer<
  typeof insertCreativeTreatmentSchema
>;
export type InsertAdkSession = z.infer<typeof insertAdkSessionSchema>;
export type CreativeProject = typeof creativeProjectsTable.$inferSelect;
export type CreativeTreatmentRecord =
  typeof creativeTreatmentsTable.$inferSelect;
export type AdkSession = typeof adkSessionsTable.$inferSelect;