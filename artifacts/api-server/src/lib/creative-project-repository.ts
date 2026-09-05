import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
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
  owner: CreationOwner;
  brief: string;
  sessionId: string;
  userId: string;
};

export type OwnerContext =
  | { kind: "guest"; workspaceId: string }
  | { kind: "account"; accountUserId: string };

export type CreationOwner = {
  workspaceId: string;
  accountUserId: string | null;
};

export interface CreativeProjectRepository {
  startGeneration(input: StartGenerationInput): Promise<void>;
  completeGeneration(
    projectId: string,
    workspaceId: string,
    sessionId: string,
    treatment: unknown,
  ): Promise<PersistedCreativeProject>;
  failGeneration(
    projectId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<void>;
  listProjects(owner: OwnerContext): Promise<PersistedCreativeProject[]>;
  getProject(
    projectId: string,
    owner: OwnerContext,
  ): Promise<PersistedCreativeProject | null>;
  listTreatments(
    projectId: string,
    owner: OwnerContext,
  ): Promise<PersistedTreatmentRevision[]>;
  countUnclaimedProjects(workspaceId: string): Promise<number>;
  claimWorkspace(workspaceId: string, accountUserId: string): Promise<number>;
}

function ownerCondition(owner: OwnerContext) {
  return owner.kind === "account"
    ? eq(creativeProjectsTable.accountUserId, owner.accountUserId)
    : and(
        eq(creativeProjectsTable.ownerId, owner.workspaceId),
        isNull(creativeProjectsTable.accountUserId),
      );
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
        ownerId: input.owner.workspaceId,
        accountUserId: input.owner.accountUserId,
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

  async completeGeneration(projectId, workspaceId, sessionId, treatment) {
    const completedProject = await db.transaction(async (tx) => {
      // ownerId is the immutable browser workspace and sessionId is a private,
      // per-run capability. Together with the project/session relationship they
      // let an active run finish safely even if account ownership is claimed.
      const [activeRun] = await tx
        .select({ projectId: creativeProjectsTable.id })
        .from(creativeProjectsTable)
        .innerJoin(
          adkSessionsTable,
          eq(adkSessionsTable.projectId, creativeProjectsTable.id),
        )
        .where(
          and(
            eq(creativeProjectsTable.id, projectId),
            eq(creativeProjectsTable.ownerId, workspaceId),
            eq(creativeProjectsTable.status, "generating"),
            eq(adkSessionsTable.id, sessionId),
            eq(adkSessionsTable.status, "running"),
          ),
        )
        .for("update");

      if (!activeRun) {
        throw new Error("Creative generation was no longer active.");
      }

      const [completedSession] = await tx
        .update(adkSessionsTable)
        .set({ status: "completed" })
        .where(
          and(
            eq(adkSessionsTable.id, sessionId),
            eq(adkSessionsTable.projectId, projectId),
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
            eq(creativeProjectsTable.ownerId, workspaceId),
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

  async failGeneration(projectId, workspaceId, sessionId) {
    await db.transaction(async (tx) => {
      const [activeRun] = await tx
        .select({ projectId: creativeProjectsTable.id })
        .from(creativeProjectsTable)
        .innerJoin(
          adkSessionsTable,
          eq(adkSessionsTable.projectId, creativeProjectsTable.id),
        )
        .where(
          and(
            eq(creativeProjectsTable.id, projectId),
            eq(creativeProjectsTable.ownerId, workspaceId),
            eq(creativeProjectsTable.status, "generating"),
            eq(adkSessionsTable.id, sessionId),
            eq(adkSessionsTable.status, "running"),
          ),
        )
        .for("update");

      if (!activeRun) return;

      const [failedSession] = await tx
        .update(adkSessionsTable)
        .set({ status: "failed" })
        .where(
          and(
            eq(adkSessionsTable.id, sessionId),
              eq(adkSessionsTable.projectId, projectId),
            eq(adkSessionsTable.status, "running"),
          ),
        )
        .returning({ id: adkSessionsTable.id });
      const [failedProject] = await tx
        .update(creativeProjectsTable)
        .set({ status: "failed" })
        .where(
          and(
            eq(creativeProjectsTable.id, projectId),
            eq(creativeProjectsTable.ownerId, workspaceId),
            eq(creativeProjectsTable.status, "generating"),
          ),
        )
        .returning({ id: creativeProjectsTable.id });

      if (!failedSession || !failedProject) {
        throw new Error("Creative generation was no longer active.");
      }
    });
  },

  async listProjects(owner) {
    const [projects, treatments] = await Promise.all([
      db
        .select()
        .from(creativeProjectsTable)
        .where(ownerCondition(owner))
        .orderBy(desc(creativeProjectsTable.createdAt)),
      db.select({ treatment: creativeTreatmentsTable })
        .from(creativeTreatmentsTable)
        .innerJoin(
          creativeProjectsTable,
          and(
            eq(creativeProjectsTable.id, creativeTreatmentsTable.projectId),
            ownerCondition(owner),
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

  async getProject(projectId, owner) {
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
          ownerCondition(owner),
        ),
      )
      .orderBy(desc(creativeTreatmentsTable.createdAt))
      .limit(1);

    return row ? toProject(row) : null;
  },

  async listTreatments(projectId, owner) {
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
            ownerCondition(owner),
        ),
      )
      .where(eq(creativeTreatmentsTable.projectId, projectId))
      .orderBy(desc(creativeTreatmentsTable.createdAt));

    return rows;
  },

  async countUnclaimedProjects(workspaceId) {
    const rows = await db
      .select({ id: creativeProjectsTable.id })
      .from(creativeProjectsTable)
      .where(
        and(
          eq(creativeProjectsTable.ownerId, workspaceId),
          isNull(creativeProjectsTable.accountUserId),
        ),
      );
    return rows.length;
  },

  async claimWorkspace(workspaceId, accountUserId) {
    const claimed = await db
      .update(creativeProjectsTable)
      .set({ accountUserId })
      .where(
        and(
          eq(creativeProjectsTable.ownerId, workspaceId),
          isNull(creativeProjectsTable.accountUserId),
        ),
      )
      .returning({ id: creativeProjectsTable.id });
    return claimed.length;
  },
};