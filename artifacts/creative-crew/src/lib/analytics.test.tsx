import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  trackEvent,
  type AccountAnalyticsEvent,
} from "./analytics";

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "window",
);

function setWindow(value: Partial<Window>): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("emits each account event with its exact whitelisted payload", () => {
  const calls: Array<{
    name: string;
    data?: Record<string, string | number | boolean>;
  }> = [];
  setWindow({
    umami: {
      track(name, data) {
        calls.push({ name, data });
      },
    },
  });

  trackEvent({ name: "account_entry_clicked", entry: "sign_in" });
  trackEvent({ name: "account_entry_clicked", entry: "sign_up" });
  trackEvent({ name: "project_claim_succeeded", claimedProjectCount: 0 });
  trackEvent({ name: "project_claim_succeeded", claimedProjectCount: 3 });
  trackEvent({ name: "project_claim_failed" });

  assert.deepEqual(calls, [
    {
      name: "account_entry_clicked",
      data: { entry: "sign_in", location: "workspace_header" },
    },
    {
      name: "account_entry_clicked",
      data: { entry: "sign_up", location: "workspace_header" },
    },
    {
      name: "project_claim_succeeded",
      data: { claimed_project_count: 0 },
    },
    {
      name: "project_claim_succeeded",
      data: { claimed_project_count: 3 },
    },
    { name: "project_claim_failed", data: undefined },
  ]);
});

test("strips arbitrary runtime fields instead of forwarding them", () => {
  const calls: unknown[][] = [];
  setWindow({
    umami: {
      track(...args) {
        calls.push(args);
      },
    },
  });

  trackEvent({
    name: "account_entry_clicked",
    entry: "sign_up",
    email: "private@example.com",
    secret: "do-not-send",
  } as AccountAnalyticsEvent);
  trackEvent({
    name: "project_claim_succeeded",
    claimedProjectCount: 2,
    projectId: "private-id",
    brief: "private brief",
  } as AccountAnalyticsEvent);
  trackEvent({
    name: "project_claim_failed",
    error: new Error("private error"),
    cookie: "private-cookie",
  } as AccountAnalyticsEvent);

  assert.deepEqual(calls, [
    [
      "account_entry_clicked",
      { entry: "sign_up", location: "workspace_header" },
    ],
    ["project_claim_succeeded", { claimed_project_count: 2 }],
    ["project_claim_failed"],
  ]);
});

test("skips invalid entries, counts, and unknown runtime event names", () => {
  const calls: unknown[][] = [];
  setWindow({
    umami: {
      track(...args) {
        calls.push(args);
      },
    },
  });

  const invalidEvents: unknown[] = [
    { name: "account_entry_clicked", entry: "log_in" },
    { name: "project_claim_succeeded", claimedProjectCount: -1 },
    { name: "project_claim_succeeded", claimedProjectCount: 1.5 },
    {
      name: "project_claim_succeeded",
      claimedProjectCount: Number.MAX_SAFE_INTEGER + 1,
    },
    { name: "project_claim_succeeded", claimedProjectCount: Number.NaN },
    { name: "unknown_event", email: "private@example.com" },
    null,
  ];

  for (const event of invalidEvents) {
    trackEvent(event as AccountAnalyticsEvent);
  }

  assert.deepEqual(calls, []);
});

test("is a no-op without window or without the tracker", () => {
  Reflect.deleteProperty(globalThis, "window");
  assert.doesNotThrow(() =>
    trackEvent({ name: "project_claim_failed" }),
  );

  setWindow({});
  assert.doesNotThrow(() =>
    trackEvent({ name: "project_claim_failed" }),
  );
});

test("swallows synchronous tracker and getter errors", () => {
  setWindow({
    umami: {
      track() {
        throw new Error("tracker failed");
      },
    },
  });
  assert.doesNotThrow(() =>
    trackEvent({ name: "project_claim_failed" }),
  );

  const throwingWindow = {};
  Object.defineProperty(throwingWindow, "umami", {
    get() {
      throw new Error("tracker getter failed");
    },
  });
  setWindow(throwingWindow);
  assert.doesNotThrow(() =>
    trackEvent({ name: "project_claim_failed" }),
  );
});

test("handles rejected tracker promises without an unhandled rejection", async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);

  try {
    setWindow({
      umami: {
        track() {
          return Promise.reject(new Error("async tracker failed"));
        },
      },
    });

    trackEvent({ name: "project_claim_failed" });
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});