import { dom } from "../test/dom";
import assert from "node:assert/strict";
import { after, test, type TestContext } from "node:test";
import { act, screen, waitFor } from "@testing-library/react";
import { brief, json, project, renderPage } from "../test/treatment-page";

after(() => dom.window.close());

type RecordedEvent = { name: string; data: Record<string, string | number | boolean> | undefined };
type TrackerMode = "working" | "absent" | "throws" | "rejects";

function installTracker(t: TestContext, mode: TrackerMode = "working") {
  const original = Object.getOwnPropertyDescriptor(window, "umami");
  const events: RecordedEvent[] = [];
  Object.defineProperty(window, "umami", {
    configurable: true,
    value: mode === "absent" ? undefined : {
      track: (name: string, data?: RecordedEvent["data"]) => {
        events.push({ name, data });
        if (mode === "throws") throw new Error("Test tracker unavailable");
        if (mode === "rejects") return Promise.reject(new Error("Test tracker unavailable"));
        return undefined;
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(window, "umami", original);
    else Reflect.deleteProperty(window, "umami");
  });
  return events;
}

const claimButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Save browser projects to my account" });
const submitButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Generate Pre-Production Package" });

async function ready() {
  await waitFor(() => assert.equal(submitButton().disabled, false));
}

const entries = [
  { label: "Sign In", entry: "sign_in", path: "/sign-in" },
  { label: "Create Account", entry: "sign_up", path: "/sign-up" },
] as const;

for (const entry of entries) {
  test(`${entry.label} records a safe entry click, not a completed authentication`, async (t) => {
    const events = installTracker(t);
    const { user, client } = renderPage(t);
    await ready();
    assert.deepEqual(events, [], "Rendering account links must not emit click events");

    await user.click(screen.getByRole("link", { name: entry.label }));
    assert.equal(window.location.pathname, entry.path);
    assert.deepEqual(events, [{
      name: "account_entry_clicked",
      data: { entry: entry.entry, location: "workspace_header" },
    }]);

    await act(async () => { await client.refetchQueries(); });
    assert.equal(events.length, 1, "Refetching must not manufacture another entry click");
  });

  for (const mode of ["absent", "throws", "rejects"] as const) {
    test(`${entry.label} still navigates when analytics ${mode}`, async (t) => {
      installTracker(t, mode);
      const { user } = renderPage(t);
      await ready();
      await user.click(screen.getByRole("link", { name: entry.label }));
      assert.equal(window.location.pathname, entry.path);
    });
  }
}

for (const claimedProjectCount of [2, 0]) {
  test(`claim success reports the server count (${claimedProjectCount}) once, only after its response`, async (t) => {
    const events = installTracker(t);
    const pending = Promise.withResolvers<Response>();
    let completed = false;
    const { user, client, requests } = renderPage(t, {
      signedIn: true,
      workspace: () => json({ signedIn: true, unclaimedProjectCount: completed ? 0 : 2 }),
      claim: () => pending.promise,
    });
    await ready();
    assert.deepEqual(events, [], "Discovering the claim prompt is not a successful claim");
    await user.click(claimButton());
    await waitFor(() => assert.equal(claimButton().disabled, true));
    assert.deepEqual(events, [], "No success event may be sent while the server request is pending");
    await user.click(claimButton());
    assert.equal(requests.filter(({ path, method }) => path.endsWith("/claim") && method === "POST").length, 1);

    completed = true;
    await act(async () => pending.resolve(json({ claimedProjectCount })));
    const message = await screen.findByTestId("claim-success");
    assert.match(message.textContent ?? "", claimedProjectCount > 0
      ? /2 browser projects saved to your account/
      : /No unclaimed browser projects remain/);
    assert.deepEqual(events, [{
      name: "project_claim_succeeded",
      data: { claimed_project_count: claimedProjectCount },
    }]);

    const readsBefore = requests.filter(({ method }) => method === "GET").length;
    await act(async () => { await client.refetchQueries(); });
    assert.ok(requests.filter(({ method }) => method === "GET").length > readsBefore);
    assert.equal(events.length, 1, "Workspace/list refetches must never emit another claim outcome");
    assert.deepEqual(requests.filter(({ path }) => path.endsWith("/claim")).map(({ body }) => body), [{ confirm: true }]);
  });
}

test("a failed claim emits only failure, and a successful retry emits one separate confirmed success", async (t) => {
  const events = installTracker(t);
  const pending = Promise.withResolvers<Response>();
  let attempts = 0;
  const { user, client } = renderPage(t, {
    signedIn: true,
    workspace: () => json({ signedIn: true, unclaimedProjectCount: attempts >= 2 ? 0 : 1 }),
    claim: () => ++attempts === 1 ? pending.promise : json({ claimedProjectCount: 1 }),
  });
  await ready();
  await user.click(claimButton());
  assert.deepEqual(events, []);
  await act(async () => pending.resolve(json({ error: "Private server diagnostic must not be tracked." }, 500)));
  await screen.findByText("Failed to save projects. Please try again.");
  assert.deepEqual(events, [{ name: "project_claim_failed", data: undefined }]);
  assert.equal(claimButton().disabled, false);
  assert.equal(screen.queryByTestId("claim-success"), null);

  await act(async () => { await client.refetchQueries(); });
  assert.equal(events.length, 1);
  await user.click(claimButton());
  await screen.findByTestId("claim-success");
  assert.deepEqual(events, [
    { name: "project_claim_failed", data: undefined },
    { name: "project_claim_succeeded", data: { claimed_project_count: 1 } },
  ]);
  assert.equal(attempts, 2);
});

test("a claim network failure is measured without sending the exception text", async (t) => {
  const events = installTracker(t);
  const { user } = renderPage(t, {
    signedIn: true,
    workspace: () => json({ signedIn: true, unclaimedProjectCount: 1 }),
    claim: () => Promise.reject(new TypeError("Private network diagnostic must not be tracked.")),
  });
  await ready();
  await user.click(claimButton());
  await screen.findByText("Failed to save projects. Please try again.");
  assert.deepEqual(events, [{ name: "project_claim_failed", data: undefined }]);
  assert.equal(claimButton().disabled, false);
});

for (const mode of ["absent", "throws", "rejects"] as const) {
  test(`claiming and subsequent generation still work when analytics ${mode}`, async (t) => {
    installTracker(t, mode);
    let completed = false;
    const { user, submissions } = renderPage(t, {
      signedIn: true,
      workspace: () => json({ signedIn: true, unclaimedProjectCount: completed ? 0 : 1 }),
      claim: () => {
        completed = true;
        return json({ claimedProjectCount: 1 });
      },
      create: () => json(project),
    });
    await ready();
    await user.click(claimButton());
    await screen.findByText("1 browser project saved to your account. You can now reopen them on another device.");
    assert.equal(screen.queryByText("Failed to save projects. Please try again."), null);
    await waitFor(() => assert.equal(screen.queryByRole("button", { name: "Save browser projects to my account" }), null));

    await user.type(screen.getByRole("textbox", { name: /Director's Notes/ }), brief);
    await user.click(submitButton());
    await screen.findByRole("heading", { name: project.treatment!.title });
    screen.getByText("PRE-PRODUCTION PACKAGE APPROVED");
    assert.deepEqual(submissions().map(({ body }) => body), [{ brief }]);
  });
}