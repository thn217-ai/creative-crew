import "./dom";
import assert from "node:assert/strict";
import { mock, type TestContext } from "node:test";
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CreativeProject, CreativeWorkspace } from "@workspace/api-client-react";

// Only the external identity SDK is stubbed. Home, its form, generated API
// hooks, fetch error parsing, and query/mutation transitions all run for real.
let signedIn = false;
mock.module("@clerk/react", {
  namedExports: {
    useClerk: () => ({ signOut: async () => {} }),
    useUser: () => ({
      isLoaded: true,
      isSignedIn: signedIn,
      user: signedIn ? { primaryEmailAddress: null, fullName: "Test filmmaker" } : null,
    }),
  },
});
const { default: Home } = await import("../pages/home");

export const brief = "Create a grounded sixty-second film about a town protecting its lighthouse.";
export const workspace: CreativeWorkspace = { signedIn: false, unclaimedProjectCount: 0 };

// Deliberately synthetic API fixtures: never used by the running application.
export const project: CreativeProject = {
  id: "06d5ec7e-5473-4dc6-a23a-4689bba2071d",
  brief,
  status: "completed",
  treatment: {
    title: "Test treatment — The Last Light",
    logline: "A town protects its lighthouse.",
    centralIdea: "Shared courage.",
    emotionalDirection: "Isolation becomes hope.",
    tone: ["intimate", "urgent"],
    narrativeApproach: "One final hour.",
    visualPrinciples: ["Practical light", "Human detail"],
    audiencePromise: "Grounded cinematic hope.",
    guardrails: ["No spectacle", "No stereotypes"],
    generatedBy: "google-adk-gemini",
  },
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

type Reply = () => Response | Promise<Response>;

export function renderPage(
  t: TestContext,
  handlers: {
    signedIn?: boolean;
    workspace?: Reply;
    history?: Reply;
    project?: Reply;
    create?: Reply;
    claim?: Reply;
  } = {},
) {
  signedIn = handlers.signedIn ?? false;
  window.history.replaceState(null, "", "/");
  const requests: { method: string; path: string; body: unknown }[] = [];
  const unexpected: string[] = [];
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

  // Intercept every request. There is deliberately no real-network fallback.
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(input instanceof Request ? input.url : String(input), "http://creative-crew.test").pathname;
    const method = init?.method ?? "GET";
    requests.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "GET" && path === "/api/creative-workspace") {
      return handlers.workspace ? handlers.workspace() : json({ ...workspace, signedIn });
    }
    if (method === "GET" && path === "/api/creative-projects") {
      return handlers.history ? handlers.history() : json([]);
    }
    if (method === "GET" && path === `/api/creative-projects/${project.id}`) {
      return handlers.project ? handlers.project() : json(project);
    }
    if (method === "POST" && path === "/api/creative-treatment" && handlers.create) {
      return handlers.create();
    }
    if (method === "POST" && path === "/api/creative-workspace/claim" && handlers.claim) {
      return handlers.claim();
    }
    unexpected.push(`${method} ${path}`);
    throw new Error(`Unexpected test request: ${method} ${path}`);
  });

  t.after(() => {
    cleanup();
    client.clear();
    assert.deepEqual(unexpected, [], "All UI requests must have explicit test responses");
  });

  const user = userEvent.setup();
  render(<QueryClientProvider client={client}><Home /></QueryClientProvider>);
  return {
    user,
    client,
    requests,
    submissions: () => requests.filter(({ method, path }) => method === "POST" && path === "/api/creative-treatment"),
  };
}