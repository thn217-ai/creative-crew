import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import {
  adkSessionsTable,
  creativeProjectsTable,
  db,
} from "@workspace/db";
import { creativeProjectRepository } from "./creative-project-repository";

type Fixture = {
  projectIds: string[];
  cleanup(): Promise<void>;
};

function createFixture(): Fixture {
  const projectIds: string[] = [];
  return {
    projectIds,
    async cleanup() {
      if (projectIds.length > 0) {
        await db
          .delete(creativeProjectsTable)
          .where(inArray(creativeProjectsTable.id, projectIds));
      }
    },
  };
}

function newRun(fixture: Fixture, options?: {
  workspaceId?: string;
  accountUserId?: string | null;
}) {
  const projectId = randomUUID();
  fixture.projectIds.push(projectId);
  return {
    projectId,
    workspaceId: options?.workspaceId ?? randomUUID(),
    accountUserId: options?.accountUserId ?? null,
    sessionId: randomUUID(),
    userId: `internal-${randomUUID()}`,
    brief: "A database integration fixture brief with enough detail.",
  };
}

async function startRun(run: ReturnType<typeof newRun>) {
  await creativeProjectRepository.startGeneration({
    projectId: run.projectId,
    owner: {
      workspaceId: run.workspaceId,
      accountUserId: run.accountUserId,
    },
    sessionId: run.sessionId,
    userId: run.userId,
    brief: run.brief,
  });
}

async function statuses(projectId: string, sessionId: string) {
  const [project] = await db
    .select({ status: creativeProjectsTable.status })
    .from(creativeProjectsTable)
    .where(eq(creativeProjectsTable.id, projectId));
  const [session] = await db
    .select({ status: adkSessionsTable.status })
    .from(adkSessionsTable)
    .where(eq(adkSessionsTable.id, sessionId));
  return { project: project?.status, session: session?.status };
}

test("account ownership is isolated and independent of browser workspace", async () => {
  const fixture = createFixture();
  const accountUserId = `user_test_${randomUUID()}`;
  const run = newRun(fixture, { accountUserId });
  try {
    await startRun(run);

    const accountProjects = await creativeProjectRepository.listProjects({
      kind: "account",
      accountUserId,
    });
    assert.deepEqual(accountProjects.map(({ id }) => id), [run.projectId]);

    assert.deepEqual(
      await creativeProjectRepository.listProjects({
        kind: "guest",
        workspaceId: run.workspaceId,
      }),
      [],
    );
    assert.deepEqual(
      await creativeProjectRepository.listProjects({
        kind: "account",
        accountUserId: `user_test_${randomUUID()}`,
      }),
      [],
    );

    const detail = await creativeProjectRepository.getProject(run.projectId, {
      kind: "account",
      accountUserId,
    });
    assert.equal(detail?.id, run.projectId);
  } finally {
    await fixture.cleanup();
  }
});

test("claim revokes guest access and concurrent claims count rows once", async () => {
  const fixture = createFixture();
  const workspaceId = randomUUID();
  const accountUserId = `user_test_${randomUUID()}`;
  const first = newRun(fixture, { workspaceId });
  const second = newRun(fixture, { workspaceId });
  try {
    await Promise.all([startRun(first), startRun(second)]);
    assert.equal(
      await creativeProjectRepository.countUnclaimedProjects(workspaceId),
      2,
    );

    const counts = await Promise.all([
      creativeProjectRepository.claimWorkspace(workspaceId, accountUserId),
      creativeProjectRepository.claimWorkspace(workspaceId, accountUserId),
    ]);
    assert.deepEqual(counts.sort(), [0, 2]);
    assert.equal(
      await creativeProjectRepository.claimWorkspace(
        workspaceId,
        `user_test_${randomUUID()}`,
      ),
      0,
    );

    assert.deepEqual(
      await creativeProjectRepository.listProjects({
        kind: "guest",
        workspaceId,
      }),
      [],
    );
    const accountProjects = await creativeProjectRepository.listProjects({
      kind: "account",
      accountUserId,
    });
    assert.deepEqual(
      new Set(accountProjects.map(({ id }) => id)),
      new Set([first.projectId, second.projectId]),
    );
  } finally {
    await fixture.cleanup();
  }
});

test("completion and failure remain valid after an account claim", async () => {
  const fixture = createFixture();
  const workspaceId = randomUUID();
  const accountUserId = `user_test_${randomUUID()}`;
  const completing = newRun(fixture, { workspaceId });
  const failing = newRun(fixture, { workspaceId });
  const treatment = { title: "Persisted treatment fixture" };
  try {
    await Promise.all([startRun(completing), startRun(failing)]);
    assert.equal(
      await creativeProjectRepository.claimWorkspace(
        workspaceId,
        accountUserId,
      ),
      2,
    );

    await Promise.all([
      creativeProjectRepository.completeGeneration(
        completing.projectId,
        workspaceId,
        completing.sessionId,
        treatment,
      ),
      creativeProjectRepository.failGeneration(
        failing.projectId,
        workspaceId,
        failing.sessionId,
      ),
    ]);

    assert.deepEqual(
      await statuses(completing.projectId, completing.sessionId),
      { project: "completed", session: "completed" },
    );
    assert.deepEqual(await statuses(failing.projectId, failing.sessionId), {
      project: "failed",
      session: "failed",
    });
    assert.deepEqual(
      (
        await creativeProjectRepository.getProject(completing.projectId, {
          kind: "account",
          accountUserId,
        })
      )?.treatment,
      treatment,
    );
    assert.equal(
      await creativeProjectRepository.getProject(completing.projectId, {
        kind: "guest",
        workspaceId,
      }),
      null,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("mismatched project, session, or workspace cannot mutate a run", async () => {
  const fixture = createFixture();
  const first = newRun(fixture);
  const second = newRun(fixture);
  try {
    await Promise.all([startRun(first), startRun(second)]);

    await creativeProjectRepository.failGeneration(
      first.projectId,
      first.workspaceId,
      second.sessionId,
    );
    await creativeProjectRepository.failGeneration(
      first.projectId,
      second.workspaceId,
      first.sessionId,
    );
    await assert.rejects(
      creativeProjectRepository.completeGeneration(
        first.projectId,
        first.workspaceId,
        second.sessionId,
        { invalid: true },
      ),
      /no longer active/,
    );
    await assert.rejects(
      creativeProjectRepository.completeGeneration(
        first.projectId,
        second.workspaceId,
        first.sessionId,
        { invalid: true },
      ),
      /no longer active/,
    );

    assert.deepEqual(await statuses(first.projectId, first.sessionId), {
      project: "generating",
      session: "running",
    });
    assert.deepEqual(await statuses(second.projectId, second.sessionId), {
      project: "generating",
      session: "running",
    });

    await creativeProjectRepository.completeGeneration(
      first.projectId,
      first.workspaceId,
      first.sessionId,
      { valid: true },
    );
    await creativeProjectRepository.failGeneration(
      first.projectId,
      first.workspaceId,
      first.sessionId,
    );
    assert.deepEqual(await statuses(first.projectId, first.sessionId), {
      project: "completed",
      session: "completed",
    });
  } finally {
    await fixture.cleanup();
  }
});