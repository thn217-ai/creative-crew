import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createCreativeTreatmentRouter } from "./creative-treatment";
import type {
  CreativeProjectRepository,
  PersistedCreativeProject,
  PersistedTreatmentRevision,
} from "../lib/creative-project-repository";

const validTreatment = {
  title: "The Last Light",
  logline: "A coastal town protects its final lighthouse through one impossible storm.",
  centralIdea: "Shared courage keeps a community visible.",
  emotionalDirection: "Move from isolation to earned collective hope.",
  tone: ["intimate", "urgent"],
  narrativeApproach: "Follow three residents over the final hour before landfall.",
  visualPrinciples: ["Practical storm light", "Close human detail"],
  audiencePromise: "A grounded, uplifting story with cinematic scale.",
  guardrails: ["No disaster spectacle", "No anonymous heroics"],
  generatedBy: "google-adk-gemini" as const,
};

const servers: Server[] = [];
const fixedDate = new Date("2026-09-05T12:00:00.000Z");
const ownerId = "118fdac3-9198-429e-b95e-82b6eeb9c04c";

function createMemoryRepository(): CreativeProjectRepository {
  const projects = new Map<string, PersistedCreativeProject>();
  const treatments = new Map<string, PersistedTreatmentRevision[]>();
  const owners = new Map<string, string>();
  const accounts = new Map<string, string | null>();

  return {
    async startGeneration({ projectId, owner, brief }) {
      owners.set(projectId, owner.workspaceId);
      accounts.set(projectId, owner.accountUserId);
      projects.set(projectId, {
        id: projectId,
        brief,
        status: "generating",
        treatment: null,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      });
    },
    async completeGeneration(projectId, projectOwnerId, _sessionId, treatment) {
      const project = projects.get(projectId);
      assert.ok(project);
      assert.equal(owners.get(projectId), projectOwnerId);
      const completed = {
        ...project,
        status: "completed" as const,
        treatment,
      };
      projects.set(projectId, completed);
      treatments.set(projectId, [
        {
          id: "e37b6744-e15f-4fb8-a6c6-48bc1fa65c7c",
          treatment,
          createdAt: fixedDate,
        },
      ]);
      return completed;
    },
    async failGeneration(projectId, projectOwnerId) {
      const project = projects.get(projectId);
      if (
        project &&
        owners.get(projectId) === projectOwnerId &&
        project.status === "generating"
      ) {
        projects.set(projectId, { ...project, status: "failed" });
      }
    },
    async listProjects(owner) {
      return [...projects.entries()]
        .filter(([projectId]) =>
          owner.kind === "account"
            ? accounts.get(projectId) === owner.accountUserId
            : owners.get(projectId) === owner.workspaceId &&
              accounts.get(projectId) === null,
        )
        .map(([, project]) => project);
    },
    async getProject(projectId, owner) {
      const owned =
        owner.kind === "account"
          ? accounts.get(projectId) === owner.accountUserId
          : owners.get(projectId) === owner.workspaceId &&
            accounts.get(projectId) === null;
      return owned
        ? projects.get(projectId) ?? null
        : null;
    },
    async listTreatments(projectId, owner) {
      const owned =
        owner.kind === "account"
          ? accounts.get(projectId) === owner.accountUserId
          : owners.get(projectId) === owner.workspaceId &&
            accounts.get(projectId) === null;
      return owned
        ? treatments.get(projectId) ?? []
        : [];
    },
    async countUnclaimedProjects(workspaceId) {
      return [...owners].filter(
        ([projectId, value]) =>
          value === workspaceId && accounts.get(projectId) === null,
      ).length;
    },
    async claimWorkspace(workspaceId, accountUserId) {
      let count = 0;
      for (const [projectId, value] of owners) {
        if (value === workspaceId && accounts.get(projectId) === null) {
          accounts.set(projectId, accountUserId);
          count += 1;
        }
      }
      return count;
    },
  };
}

afterEach(() => {
  delete process.env["GOOGLE_API_KEY"];
  for (const server of servers.splice(0)) server.close();
});

async function postTreatment(
  generator: (brief: string) => Promise<unknown>,
  body: unknown,
  repository = createMemoryRepository(),
  configureProvider = true,
) {
  if (configureProvider) {
    process.env["GOOGLE_API_KEY"] = "configured-for-test";
  } else {
    delete process.env["GOOGLE_API_KEY"];
  }
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: ownerId };
    req.log = {
      error() {},
    } as unknown as typeof req.log;
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      generator,
      repository,
      () => ({ userId: null }),
      (req) => req.get("host"),
    ),
  );

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const origin = `http://127.0.0.1:${port}`;
  return fetch(`${origin}/api/creative-treatment`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

test("submits the brief and returns every required treatment field", async () => {
  let receivedBrief = "";
  const brief =
    "Create a cinematic community story about keeping a lighthouse alive.";
  const response = await postTreatment(async (value) => {
    receivedBrief = value;
    return validTreatment;
  }, { brief });

  assert.equal(response.status, 201);
  assert.equal(receivedBrief, brief);
  const project = (await response.json()) as Record<string, unknown>;
  assert.equal(project["brief"], brief);
  assert.equal(project["status"], "completed");
  assert.deepEqual(project["treatment"], validTreatment);
  assert.match(String(project["id"]), /^[0-9a-f-]{36}$/);
});

test("rejects an invalid brief before calling the provider", async () => {
  let providerCalled = false;
  const response = await postTreatment(async () => {
    providerCalled = true;
    return validTreatment;
  }, { brief: "Too short" });

  assert.equal(response.status, 400);
  assert.equal(providerCalled, false);
  assert.deepEqual(await response.json(), {
    error:
      "Enter a creative brief of at least 20 characters before starting the crew.",
  });
});

test("returns a safe error when the provider fails", async () => {
  const response = await postTreatment(async () => {
    throw new Error("provider unavailable");
  }, { brief: "A sufficiently detailed brief for provider failure coverage." });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "The creative crew could not complete the treatment. Please try again.",
  });
});

test("rejects malformed provider output instead of returning a partial treatment", async () => {
  const response = await postTreatment(async () => ({
    title: "Incomplete treatment",
    generatedBy: "google-adk-gemini",
  }), { brief: "A sufficiently detailed brief for malformed output coverage." });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "The creative crew could not complete the treatment. Please try again.",
  });
});

test("keeps submitted briefs after generation fails", async () => {
  const repository = createMemoryRepository();
  const brief = "A detailed brief whose provider call fails after it is saved.";
  const response = await postTreatment(
    async () => {
      throw new Error("provider unavailable");
    },
    { brief },
    repository,
  );

  assert.equal(response.status, 502);
  const projects = await repository.listProjects({
    kind: "guest",
    workspaceId: ownerId,
  });
  assert.equal(projects.length, 1);
  assert.equal(projects[0]?.brief, brief);
  assert.equal(projects[0]?.status, "failed");
  assert.equal(projects[0]?.treatment, null);
});

test("lists saved project history without provider session identifiers", async () => {
  process.env["GOOGLE_API_KEY"] = "configured-for-test";
  const repository = createMemoryRepository();
  await repository.startGeneration({
    projectId: "550e8400-e29b-41d4-a716-446655440000",
    owner: { workspaceId: ownerId, accountUserId: null },
    brief: "A saved brief that can be reopened after a browser refresh.",
    sessionId: "76f202a4-0f20-4a76-a9ec-f8dbbf626d1e",
    userId: "internal-user",
  });
  await repository.completeGeneration(
    "550e8400-e29b-41d4-a716-446655440000",
    ownerId,
    "76f202a4-0f20-4a76-a9ec-f8dbbf626d1e",
    validTreatment,
  );

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: ownerId };
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => validTreatment,
      repository,
      () => ({ userId: null }),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const response = await fetch(
    `http://127.0.0.1:${port}/api/creative-projects`,
  );
  assert.equal(response.status, 200);
  const projects = (await response.json()) as Array<Record<string, unknown>>;
  assert.equal(projects.length, 1);
  assert.deepEqual(projects[0]?.["treatment"], validTreatment);
  assert.equal("sessionId" in (projects[0] ?? {}), false);
  assert.equal("userId" in (projects[0] ?? {}), false);
});

test("exposes validated treatment revision history for a saved project", async () => {
  process.env["GOOGLE_API_KEY"] = "configured-for-test";
  const repository = createMemoryRepository();
  const projectId = "550e8400-e29b-41d4-a716-446655440000";
  const sessionId = "76f202a4-0f20-4a76-a9ec-f8dbbf626d1e";
  await repository.startGeneration({
    projectId,
    owner: { workspaceId: ownerId, accountUserId: null },
    brief: "A saved brief with a validated treatment revision.",
    sessionId,
    userId: "internal-user",
  });
  await repository.completeGeneration(
    projectId,
    ownerId,
    sessionId,
    validTreatment,
  );

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: ownerId };
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => validTreatment,
      repository,
      () => ({ userId: null }),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const response = await fetch(
    `http://127.0.0.1:${port}/api/creative-projects/${projectId}/treatments`,
  );
  assert.equal(response.status, 200);
  const revisions = (await response.json()) as Array<Record<string, unknown>>;
  assert.equal(revisions.length, 1);
  assert.deepEqual(revisions[0]?.["treatment"], validTreatment);
  assert.equal("projectId" in (revisions[0] ?? {}), false);
});

test("persists a valid brief even when Google is not configured", async () => {
  const repository = createMemoryRepository();
  const brief = "A valid brief submitted while the provider is not configured.";
  const response = await postTreatment(
    async () => validTreatment,
    { brief },
    repository,
    false,
  );

  assert.equal(response.status, 502);
  const projects = await repository.listProjects({
    kind: "guest",
    workspaceId: ownerId,
  });
  assert.equal(projects.length, 1);
  assert.equal(projects[0]?.brief, brief);
  assert.equal(projects[0]?.status, "failed");
});

test("does not downgrade completed work after a response-stage error", async () => {
  const repository = createMemoryRepository();
  const completeGeneration = repository.completeGeneration.bind(repository);
  repository.completeGeneration = async (...args) => {
    const project = await completeGeneration(...args);
    return { ...project, id: "invalid-response-id" };
  };

  const response = await postTreatment(
    async () => validTreatment,
    { brief: "A valid brief that completes before response serialization fails." },
    repository,
  );

  assert.equal(response.status, 502);
  const projects = await repository.listProjects({
    kind: "guest",
    workspaceId: ownerId,
  });
  assert.equal(projects[0]?.status, "completed");
  assert.deepEqual(projects[0]?.treatment, validTreatment);
});

test("does not reveal a project to another browser workspace", async () => {
  const repository = createMemoryRepository();
  const projectId = "550e8400-e29b-41d4-a716-446655440000";
  await repository.startGeneration({
    projectId,
    owner: { workspaceId: ownerId, accountUserId: null },
    brief: "A private brief belonging to one browser workspace.",
    sessionId: "76f202a4-0f20-4a76-a9ec-f8dbbf626d1e",
    userId: "internal-user",
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = {
      creative_workspace: "288541f1-1e1e-4ea7-b077-9e85f1ae4f86",
    };
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => validTreatment,
      repository,
      () => ({ userId: null }),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const response = await fetch(
    `http://127.0.0.1:${port}/api/creative-projects/${projectId}`,
  );
  assert.equal(response.status, 404);
});

test("rejects treatment mutations with hostile or missing origins", async () => {
  process.env["GOOGLE_API_KEY"] = "configured-for-test";
  let providerCalls = 0;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: ownerId };
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => {
        providerCalls += 1;
        return validTreatment;
      },
      createMemoryRepository(),
      () => ({ userId: null }),
      (req) => req.get("host"),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/api/creative-treatment`;
  const body = JSON.stringify({
    brief: "A sufficiently detailed brief for origin validation coverage.",
  });

  for (const headers of [
    { "content-type": "application/json" },
    {
      "content-type": "application/json",
      origin: "https://hostile.example",
    },
  ]) {
    const response = await fetch(url, { method: "POST", headers, body });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(providerCalls, 0);
});

test("claims only the signed browser workspace and isolates account reads", async () => {
  const repository = createMemoryRepository();
  const projectId = "550e8400-e29b-41d4-a716-446655440000";
  await repository.startGeneration({
    projectId,
    owner: { workspaceId: ownerId, accountUserId: null },
    brief: "An anonymous project ready to be saved to a verified account.",
    sessionId: "76f202a4-0f20-4a76-a9ec-f8dbbf626d1e",
    userId: "internal-user",
  });

  let currentUserId: string | null = "user_account_a";
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: ownerId };
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => validTreatment,
      repository,
      () => ({ userId: currentUserId }),
      (req) => req.get("host"),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  const workspace = await fetch(`${origin}/api/creative-workspace`);
  assert.deepEqual(await workspace.json(), {
    signedIn: true,
    unclaimedProjectCount: 1,
  });

  const [firstClaim, concurrentRetry] = await Promise.all([
    fetch(`${origin}/api/creative-workspace/claim`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ confirm: true, accountUserId: "spoofed" }),
    }),
    fetch(`${origin}/api/creative-workspace/claim`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ confirm: true }),
    }),
  ]);
  const counts = [
    ((await firstClaim.json()) as { claimedProjectCount: number })
      .claimedProjectCount,
    ((await concurrentRetry.json()) as { claimedProjectCount: number })
      .claimedProjectCount,
  ].sort();
  assert.deepEqual(counts, [0, 1]);

  const accountAList = await fetch(`${origin}/api/creative-projects`);
  assert.equal(((await accountAList.json()) as unknown[]).length, 1);

  currentUserId = null;
  const formerGuestList = await fetch(`${origin}/api/creative-projects`);
  assert.deepEqual(await formerGuestList.json(), []);
  const formerGuestDetail = await fetch(
    `${origin}/api/creative-projects/${projectId}`,
  );
  assert.equal(formerGuestDetail.status, 404);

  currentUserId = "user_account_b";
  const wrongAccountList = await fetch(`${origin}/api/creative-projects`);
  assert.deepEqual(await wrongAccountList.json(), []);
  const wrongAccountClaim = await fetch(
    `${origin}/api/creative-workspace/claim`,
    {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ confirm: true }),
    },
  );
  assert.deepEqual(await wrongAccountClaim.json(), { claimedProjectCount: 0 });

  currentUserId = "user_account_a";
  const accountAHistory = await fetch(
    `${origin}/api/creative-projects/${projectId}/treatments`,
  );
  assert.equal(accountAHistory.status, 200);
});

test("requires verified auth, valid cookie, JSON, and same origin to claim", async () => {
  const repository = createMemoryRepository();
  let currentUserId: string | null = null;
  let cookie: unknown = ownerId;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: cookie };
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => validTreatment,
      repository,
      () => ({ userId: currentUserId }),
      (req) => req.get("host"),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;
  const claim = (headers: Record<string, string>, body = '{"confirm":true}') =>
    fetch(`${origin}/api/creative-workspace/claim`, {
      method: "POST",
      headers,
      body,
    });

  assert.equal(
    (await claim({ "content-type": "application/json", origin })).status,
    401,
  );
  currentUserId = "user_verified";
  assert.equal(
    (
      await claim({
        "content-type": "application/json",
        origin: "https://hostile.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (await claim({ "content-type": "application/json" })).status,
    403,
  );
  assert.equal(
    (await claim({ "content-type": "text/plain", origin })).status,
    400,
  );
  assert.equal(
    (
      await claim(
        { "content-type": "application/json", origin },
        '{"confirm":false}',
      )
    ).status,
    400,
  );
  cookie = "not-a-signed-uuid";
  assert.equal(
    (await claim({ "content-type": "application/json", origin })).status,
    403,
  );
});

test("an in-flight generation completes after its workspace is claimed", async () => {
  process.env["GOOGLE_API_KEY"] = "configured-for-test";
  const repository = createMemoryRepository();
  let currentUserId: string | null = null;
  let releaseProvider!: (value: unknown) => void;
  let signalProviderStarted!: () => void;
  const providerStarted = new Promise<void>((resolve) => {
    signalProviderStarted = resolve;
  });
  const providerResult = new Promise<unknown>((resolve) => {
    releaseProvider = resolve;
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: ownerId };
    req.log = { error() {} } as unknown as typeof req.log;
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => {
        signalProviderStarted();
        return providerResult;
      },
      repository,
      () => ({ userId: currentUserId }),
      (req) => req.get("host"),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  const generation = fetch(`${origin}/api/creative-treatment`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      brief: "A generation that remains secure while its workspace is claimed.",
    }),
  });
  await providerStarted;

  currentUserId = "user_claiming_during_generation";
  const claim = await fetch(`${origin}/api/creative-workspace/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ confirm: true }),
  });
  assert.deepEqual(await claim.json(), { claimedProjectCount: 1 });

  releaseProvider(validTreatment);
  const generationResponse = await generation;
  assert.equal(generationResponse.status, 201);
  const generatedProject = (await generationResponse.json()) as {
    id: string;
  };

  const accountDetail = await fetch(
    `${origin}/api/creative-projects/${generatedProject.id}`,
  );
  assert.equal(accountDetail.status, 200);

  currentUserId = null;
  const guestDetail = await fetch(
    `${origin}/api/creative-projects/${generatedProject.id}`,
  );
  assert.equal(guestDetail.status, 404);
});

test("signed-in generation is account-owned across browser workspaces", async () => {
  process.env["GOOGLE_API_KEY"] = "configured-for-test";
  const repository = createMemoryRepository();
  let workspaceId = ownerId;
  let currentUserId: string | null = "user_cross_device";
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = { creative_workspace: workspaceId };
    req.log = { error() {} } as unknown as typeof req.log;
    next();
  });
  app.use(
    "/api",
    createCreativeTreatmentRouter(
      async () => validTreatment,
      repository,
      () => ({ userId: currentUserId }),
      (req) => req.get("host"),
    ),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  const created = await fetch(`${origin}/api/creative-treatment`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      brief: "An account project that can be reopened from another device.",
    }),
  });
  assert.equal(created.status, 201);
  const project = (await created.json()) as { id: string };

  workspaceId = "288541f1-1e1e-4ea7-b077-9e85f1ae4f86";
  const otherDevice = await fetch(
    `${origin}/api/creative-projects/${project.id}`,
  );
  assert.equal(otherDevice.status, 200);

  currentUserId = null;
  const guestOnOtherDevice = await fetch(
    `${origin}/api/creative-projects/${project.id}`,
  );
  assert.equal(guestOnOtherDevice.status, 404);
});