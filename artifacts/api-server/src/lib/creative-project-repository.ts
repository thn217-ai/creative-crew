import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  adkSessionsTable,
  creativeProjectsTable,
  creativeTreatmentsTable,
  db,
} from "@workspace/db";

export type ProjectStatus = "generating" | "completed" | "failed";

export type PersistedCreativeProject = {
  id: string;
  brief: string;
  status: ProjectStatus;
  treatment: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PersistedTreatmentRevision = {
  id: string;
  treatment: unknown;
  createdAt: Date;
};

type StartGenerationInput = {
  projectId: string;
  ownerId: string;
  brief: string;
  sessionId: string;
  userId: string;
};

export interface CreativeProjectRepository {
  startGeneration(input: StartGenerationInput): Promise<void>;
  completeGeneration(
    projectId: string,
    ownerId: string,
    sessionId: string,
    treatment: unknown,
  ): Promise<PersistedCreativeProject>;
  failGeneration(
    projectId: string,
    ownerId: string,
    sessionId: string,
  ): Promise<void>;
  listProjects(ownerId: string): Promise<PersistedCreativeProject[]>;
  getProject(
    projectId: string,
    ownerId: string,
  ): Promise<PersistedCreativeProject | null>;
  listTreatments(
    projectId: string,
    ownerId: string,
  ): Promise<PersistedTreatmentRevision[]>;
}

function toProject(row: {
  project: typeof creativeProjectsTable.$inferSelect;
  treatment: typeof creativeTreatmentsTable.$inferSelect | null;
}): PersistedCreativeProject {
  return {
    id: row.project.id,
    brief: row.project.brief,
    status: row.project.status as ProjectStatus,
    treatment: row.treatment?.treatment ?? null,
    createdAt: row.project.createdAt,
    updatedAt: row.project.updatedAt,
  };
}

export const creativeProjectRepository: CreativeProjectRepository = {
  async startGeneration(input) {
    await db.transaction(async (tx) => {
      await tx.insert(creativeProjectsTable).values({
        id: input.projectId,
        ownerId: input.ownerId,
        brief: input.brief,
        status: "generating",
      });
      await tx.insert(adkSessionsTable).values({
        id: input.sessionId,
        projectId: input.projectId,
        adkUserId: input.userId,
        status: "running",
      });
    });
  },

  async completeGeneration(projectId, ownerId, sessionId, treatment) {
    const completedProject = await db.transaction(async (tx) => {
      const [completedSession] = await tx
        .update(adkSessionsTable)
        .set({ status: "completed" })
        .where(
          and(
            eq(adkSessionsTable.id, sessionId),
            eq(adkSessionsTable.status, "running"),
          ),
        )
        .returning({ id: adkSessionsTable.id });
      const [project] = await tx
        .update(creativeProjectsTable)
        .set({ status: "completed" })
        .where(
          and(
            eq(creativeProjectsTable.id, projectId),
            eq(creativeProjectsTable.ownerId, ownerId),
            eq(creativeProjectsTable.status, "generating"),
          ),
        )
        .returning();

      if (!completedSession || !project) {
        throw new Error("Creative generation was no longer active.");
      }

      await tx.insert(creativeTreatmentsTable).values({
        id: randomUUID(),
        projectId,
        treatment,
      });

      return project;
    });

    return {
      id: completedProject.id,
      brief: completedProject.brief,
      status: "completed",
      treatment,
      createdAt: completedProject.createdAt,
      updatedAt: completedProject.updatedAt,
    };
  },

  async failGeneration(projectId, ownerId, sessionId) {
    await db.transaction(async (tx) => {
      await tx
        .update(adkSessionsTable)
        .set({ status: "failed" })
        .where(
          and(
            eq(adkSessionsTable.id, sessionId),
            eq(adkSessionsTable.status, "running"),
          ),
        );
      await tx
        .update(creativeProjectsTable)
        .set({ status: "failed" })
        .where(
          and(
            eq(creativeProjectsTable.id, projectId),
            eq(creativeProjectsTable.ownerId, ownerId),
            eq(creativeProjectsTable.status, "generating"),
          ),
        );
    });
  },

  async listProjects(ownerId) {
    const [projects, treatments] = await Promise.all([
      db
        .select()
        .from(creativeProjectsTable)
        .where(eq(creativeProjectsTable.ownerId, ownerId))
        .orderBy(desc(creativeProjectsTable.createdAt)),
      db.select({ treatment: creativeTreatmentsTable })
        .from(creativeTreatmentsTable)
        .innerJoin(
          creativeProjectsTable,
          and(
            eq(creativeProjectsTable.id, creativeTreatmentsTable.projectId),
            eq(creativeProjectsTable.ownerId, ownerId),
          ),
        )
        .orderBy(desc(creativeTreatmentsTable.createdAt)),
    ]);
    const latestTreatmentByProject = new Map<
      string,
      typeof creativeTreatmentsTable.$inferSelect
    >();
    for (const { treatment } of treatments) {
      if (!latestTreatmentByProject.has(treatment.projectId)) {
        latestTreatmentByProject.set(treatment.projectId, treatment);
      }
    }

    return projects.map((project) =>
      toProject({
        project,
        treatment: latestTreatmentByProject.get(project.id) ?? null,
      }),
    );
  },

  async getProject(projectId, ownerId) {
    const [row] = await db
      .select({
        project: creativeProjectsTable,
        treatment: creativeTreatmentsTable,
      })
      .from(creativeProjectsTable)
      .leftJoin(
        creativeTreatmentsTable,
        eq(creativeTreatmentsTable.projectId, creativeProjectsTable.id),
      )
      .where(
        and(
          eq(creativeProjectsTable.id, projectId),
          eq(creativeProjectsTable.ownerId, ownerId),
        ),
      )
      .orderBy(desc(creativeTreatmentsTable.createdAt))
      .limit(1);

    return row ? toProject(row) : null;
  },

  async listTreatments(projectId, ownerId) {
    const rows = await db
      .select({
        id: creativeTreatmentsTable.id,
        treatment: creativeTreatmentsTable.treatment,
        createdAt: creativeTreatmentsTable.createdAt,
      })
      .from(creativeTreatmentsTable)
      .innerJoin(
        creativeProjectsTable,
        and(
          eq(creativeProjectsTable.id, creativeTreatmentsTable.projectId),
          eq(creativeProjectsTable.ownerId, ownerId),
        ),
      )
      .where(eq(creativeTreatmentsTable.projectId, projectId))
      .orderBy(desc(creativeTreatmentsTable.createdAt));

    return rows;
  },
};