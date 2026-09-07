import { dom } from "../test/dom";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { act, screen, waitFor, within } from "@testing-library/react";
import { brief, json, project, renderPage, workspace } from "../test/treatment-page";

after(() => dom.window.close());

const submitButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Generate Pre-Production Package" });
const progress = () => screen.getByRole("status", { name: "Pre-production package progress" });
const briefInput = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: /Director's Notes/ });

async function ready() {
  await waitFor(() => assert.equal(submitButton().disabled, false));
}

test("workspace loading explains the wait and prevents generation before verification", async (t) => {
  const pending = Promise.withResolvers<Response>();
  const { user, submissions } = renderPage(t, { workspace: () => pending.promise });

  assert.match(screen.getByRole("status").textContent ?? "", /Checking your workspace/);
  assert.equal(submitButton().disabled, true);
  assert.equal(screen.queryByRole("button", { name: "Retry connection" }), null);
  await user.click(submitButton());
  assert.equal(submissions().length, 0);

  await act(async () => pending.resolve(json(workspace)));
  await ready();
  assert.equal(screen.queryByText("Checking your workspace…"), null);
});

test("workspace failure keeps Retry connection available and it refetches without duplicate requests", async (t) => {
  const reconnect = Promise.withResolvers<Response>();
  let attempts = 0;
  const { user, submissions } = renderPage(t, {
    workspace: () => ++attempts === 1
      ? json({ error: "Workspace temporarily unavailable." }, 503)
      : reconnect.promise,
  });

  const retry = await screen.findByRole<HTMLButtonElement>("button", { name: "Retry connection" });
  assert.match(screen.getByRole("status").textContent ?? "", /workspace session could not be verified/);
  assert.equal(retry.disabled, false);
  assert.equal(submitButton().disabled, true);

  await user.click(retry);
  await waitFor(() => assert.equal(screen.queryByRole("button", { name: "Retry connection" }), null));
  assert.match(screen.getByRole("status").textContent ?? "", /Checking your workspace/);
  assert.equal(attempts, 2);
  await user.click(submitButton());
  assert.equal(attempts, 2);
  assert.equal(submissions().length, 0);

  await act(async () => reconnect.resolve(json(workspace)));
  await ready();
  assert.equal(screen.queryByRole("button", { name: "Retry connection" }), null);
  assert.equal(screen.queryByText(/workspace session could not be verified/), null);
});

test("loading a selected saved treatment shows progress rather than an empty or approved result", async (t) => {
  const pending = Promise.withResolvers<Response>();
  renderPage(t, { history: () => json([project]), project: () => pending.promise });

  const loading = await screen.findByRole("status", { name: "Pre-production package progress" });
  assert.match(loading.textContent ?? "", /Generating Pre-Production Package/);
  assert.match(loading.textContent ?? "", /Google ADK \/ Gemini/);
  assert.equal(screen.queryByText("PRE-PRODUCTION PACKAGE APPROVED"), null);
  assert.equal(screen.queryByRole("heading", { name: "Awaiting Directives" }), null);

  await act(async () => pending.resolve(json(project)));
  await screen.findByRole("heading", { name: project.treatment!.title });
  assert.equal(screen.queryByRole("status", { name: "Pre-production package progress" }), null);
});

test("generation loading hides the prior result, keeps the brief, and blocks duplicate submissions", async (t) => {
  const pending = Promise.withResolvers<Response>();
  const { user, submissions } = renderPage(t, {
    history: () => json([project]),
    create: () => pending.promise,
  });
  await screen.findByRole("heading", { name: project.treatment!.title });
  await ready();
  await user.type(briefInput(), brief);
  await user.click(submitButton());

  const processing = await screen.findByRole<HTMLButtonElement>("button", { name: "Generating Package" });
  assert.equal(processing.disabled, true);
  assert.match(progress().textContent ?? "", /Generating Pre-Production Package/);
  assert.match(progress().textContent ?? "", /Google ADK \/ Gemini/);
  assert.equal(screen.queryByText("PRE-PRODUCTION PACKAGE APPROVED"), null);
  assert.equal(screen.queryByRole("heading", { name: project.treatment!.title }), null);
  assert.equal(briefInput().value, brief);
  assert.deepEqual(submissions().map(({ body }) => body), [{ brief }]);

  await user.click(processing);
  assert.equal(submissions().length, 1);
  await act(async () => pending.resolve(json(project)));
  await screen.findByText("PRE-PRODUCTION PACKAGE APPROVED");
  await ready();
  assert.equal(screen.queryByRole("status", { name: "Pre-production package progress" }), null);
});

const failures = [
  {
    name: "Gemini billing error",
    message: "Gemini billing credits are depleted for this Google project. Restore billing in Google AI Studio, then try again.",
  },
  {
    name: "provider timeout",
    message: "The creative crew timed out. Please try the brief again.",
  },
  {
    name: "unstructured gateway error",
    message: "Failed to generate pre-production package.",
    reply: () => new Response("Bad Gateway", { status: 502, headers: { "Content-Type": "text/plain" } }),
  },
  {
    name: "network failure",
    message: "Failed to generate pre-production package.",
    reply: () => Promise.reject(new TypeError("Failed to fetch")),
  },
];

for (const failure of failures) {
  test(`${failure.name} shows useful details and the same brief can be retried successfully`, async (t) => {
    const retried = Promise.withResolvers<Response>();
    let attempts = 0;
    const { user, submissions } = renderPage(t, {
      create: () => ++attempts === 1
        ? (failure.reply?.() ?? json({ error: failure.message }, 502))
        : retried.promise,
    });
    await ready();
    await user.type(briefInput(), brief);
    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    within(alert).getByRole("heading", { name: "System Fault" });
    within(alert).getByText(failure.message, { exact: true });
    assert.equal(screen.queryByRole("status", { name: "Pre-production package progress" }), null);
    assert.equal(screen.queryByText("PRE-PRODUCTION PACKAGE APPROVED"), null);
    assert.equal(submitButton().disabled, false, "A provider failure must not trap the form while generating");
    assert.equal(briefInput().value, brief, "Retry must not require re-entering the brief");
    assert.equal(attempts, 1, "Failed generation must not silently retry paid provider requests");

    await user.click(submitButton());
    const processing = await screen.findByRole<HTMLButtonElement>("button", { name: "Generating Package" });
    assert.equal(processing.disabled, true);
    assert.equal(screen.queryByRole("alert"), null, "Stale error details must clear during retry");
    progress();
    assert.equal(attempts, 2);
    assert.deepEqual(submissions().map(({ body }) => body), [{ brief }, { brief }]);
    await user.click(processing);
    assert.equal(attempts, 2);

    await act(async () => retried.resolve(json(project)));
    await screen.findByRole("heading", { name: project.treatment!.title });
    screen.getByText("PRE-PRODUCTION PACKAGE APPROVED");
    assert.equal(screen.getByTestId("text-attribution").textContent, "google-adk-gemini");
    assert.equal(screen.queryByRole("alert"), null);
    assert.equal(screen.queryByRole("status", { name: "Pre-production package progress" }), null);
    await ready();
    assert.equal(briefInput().value, brief);
  });
}