import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createCreativeTreatmentRouter } from "./creative-treatment";

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

afterEach(() => {
  delete process.env["GOOGLE_API_KEY"];
  for (const server of servers.splice(0)) server.close();
});

async function postTreatment(
  generator: (brief: string) => Promise<unknown>,
  body: unknown,
) {
  process.env["GOOGLE_API_KEY"] = "configured-for-test";
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.log = {
      error() {},
    } as unknown as typeof req.log;
    next();
  });
  app.use("/api", createCreativeTreatmentRouter(generator));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  return fetch(`http://127.0.0.1:${port}/api/creative-treatment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
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

  assert.equal(response.status, 200);
  assert.equal(receivedBrief, brief);
  assert.deepEqual(await response.json(), validTreatment);
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