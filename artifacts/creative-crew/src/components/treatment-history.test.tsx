import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getListCreativeProjectTreatmentsQueryKey,
  type CreativeTreatment,
  type CreativeTreatmentRevision,
} from "@workspace/api-client-react";
import { TreatmentHistory, TreatmentHistoryView } from "./treatment-history";

const latestTreatment: CreativeTreatment = {
  title: "Latest title",
  logline: "Latest logline",
  centralIdea: "Latest central idea",
  emotionalDirection: "Latest emotional direction",
  tone: ["latest tone one", "latest tone two"],
  narrativeApproach: "Latest narrative approach",
  visualPrinciples: ["latest visual one", "latest visual two"],
  audiencePromise: "Latest audience promise",
  guardrails: ["latest guardrail one", "latest guardrail two"],
  generatedBy: "google-adk-gemini",
};

const earlierTreatment: CreativeTreatment = {
  title: "Earlier title",
  logline: "Earlier logline",
  centralIdea: "Earlier central idea",
  emotionalDirection: "Earlier emotional direction",
  tone: ["earlier tone one", "earlier tone two"],
  narrativeApproach: "Earlier narrative approach",
  visualPrinciples: ["earlier visual one", "earlier visual two"],
  audiencePromise: "Earlier audience promise",
  guardrails: ["earlier guardrail one", "earlier guardrail two"],
  generatedBy: "google-adk-gemini",
};

const revisions: CreativeTreatmentRevision[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    treatment: latestTreatment,
    createdAt: "2025-03-02T12:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    treatment: earlierTreatment,
    createdAt: "2025-03-01T12:00:00.000Z",
  },
];

const baseProps = {
  revisions,
  selectedRevisionId: null,
  onSelectRevision: () => {},
  isPending: false,
  isError: false,
  isFetching: false,
  onRetry: () => {},
};

function renderView(overrides: Partial<React.ComponentProps<typeof TreatmentHistoryView>> = {}) {
  return renderToStaticMarkup(<TreatmentHistoryView {...baseProps} {...overrides} />);
}

function treatmentValues(treatment: CreativeTreatment) {
  return Object.values(treatment).flat();
}

test("uses the newest-first response as latest when selection is null", () => {
  const html = renderView();

  assert.match(html, /2 saved/);
  assert.match(html, /Viewing version 2 · Latest version/);
  assert.ok(html.indexOf(revisions[0].id) < html.indexOf(revisions[1].id));
  for (const value of treatmentValues(latestTreatment)) {
    assert.ok(html.includes(value));
  }
  assert.ok(!html.includes(earlierTreatment.logline));
});

test("renders every field from the exact selected earlier treatment", () => {
  const html = renderView({ selectedRevisionId: revisions[1].id });

  assert.match(html, /Viewing version 1 · Earlier version/);
  assert.match(html, /Back to latest/);
  for (const value of treatmentValues(earlierTreatment)) {
    assert.ok(html.includes(value), `expected earlier treatment value: ${value}`);
  }
  for (const value of treatmentValues(latestTreatment).filter((value) => value !== "google-adk-gemini")) {
    assert.ok(!html.includes(value), `did not expect latest treatment value: ${value}`);
  }
});

test("selects revisions by ID when multiple treatments have the same title", () => {
  const sameTitle = "A title reused across revisions";
  const sameTitleRevisions: CreativeTreatmentRevision[] = [
    { ...revisions[0], treatment: { ...latestTreatment, title: sameTitle } },
    { ...revisions[1], treatment: { ...earlierTreatment, title: sameTitle } },
  ];
  const html = renderView({
    revisions: sameTitleRevisions,
    selectedRevisionId: sameTitleRevisions[1].id,
  });

  assert.match(html, /Viewing version 1 · Earlier version/);
  assert.ok(html.includes(earlierTreatment.logline));
  assert.ok(!html.includes(latestTreatment.logline));
  assert.match(
    html,
    new RegExp(`<option value="${sameTitleRevisions[1].id}" selected="">Version 1`),
  );
});

test("renders loading safely while revision data is undefined", () => {
  const html = renderView({ revisions: undefined, isPending: true });

  assert.match(html, /data-testid="status-versions-loading"/);
  assert.match(html, /Loading treatment versions/);
  assert.ok(!html.includes("saved"));
  assert.ok(!html.includes("TREATMENT APPROVED"));
});

test("renders the validated empty-history state", () => {
  const html = renderView({ revisions: [] });

  assert.match(html, /0 saved/);
  assert.match(html, /data-testid="status-versions-empty"/);
  assert.match(html, /No validated treatment versions yet/);
  assert.ok(!html.includes("TREATMENT APPROVED"));
});

test("renders an initial error with an enabled retry control wired to retry", () => {
  let retries = 0;
  const html = renderView({
    revisions: undefined,
    isError: true,
    onRetry: () => {
      retries += 1;
    },
  });

  assert.match(html, /Could not load treatment versions/);
  assert.match(html, /data-testid="button-retry-versions"/);
  assert.doesNotMatch(html, /<button[^>]* disabled=""/);

  const onRetry = () => {
    retries += 1;
  };
  const tree = TreatmentHistoryView({ ...baseProps, revisions: undefined, isError: true, onRetry });
  const section = React.Children.toArray(
    (tree.props as { children: React.ReactNode }).children,
  )[0] as React.ReactElement<{ children: React.ReactNode }>;
  const error = React.Children.toArray(section.props.children).find(
    (child) => React.isValidElement<{ "data-testid"?: string }>(child)
      && child.props["data-testid"] === "status-versions-error",
  ) as React.ReactElement<{ children: React.ReactNode }>;
  const retry = React.Children.toArray(error.props.children).find(
    (child) => React.isValidElement<{ "data-testid"?: string }>(child)
      && child.props["data-testid"] === "button-retry-versions",
  ) as React.ReactElement<{ onClick: () => void }>;
  retry.props.onClick();
  assert.equal(retries, 1);
});

test("disables retry while a retry request is fetching", () => {
  const html = renderView({ revisions: undefined, isError: true, isFetching: true });

  assert.match(html, /<button[^>]* disabled=""[^>]*data-testid="button-retry-versions"/);
  assert.match(html, /Retrying/);
});

test("retains the exact selected data when a background refresh errors", () => {
  const html = renderView({
    selectedRevisionId: revisions[1].id,
    isError: true,
    isFetching: false,
  });

  assert.match(html, /Could not refresh treatment versions/);
  assert.match(html, /Viewing version 1 · Earlier version/);
  assert.ok(html.includes(earlierTreatment.logline));
  assert.ok(!html.includes(latestTreatment.logline));
  assert.ok(!html.includes("Refreshing versions"));
});

test("does not silently fall back when the explicitly selected ID is missing", () => {
  const missingId = "33333333-3333-4333-8333-333333333333";
  const html = renderView({ selectedRevisionId: missingId });

  assert.match(html, /Selected version unavailable/);
  assert.match(html, /This version is no longer available/);
  assert.match(html, /Back to latest/);
  assert.ok(!html.includes("TREATMENT APPROVED"));
  assert.ok(!html.includes(latestTreatment.logline));
});

test("does not mutate revisions or nested treatment inputs", () => {
  const input = structuredClone(revisions);
  const before = structuredClone(input);

  renderView({ revisions: input, selectedRevisionId: input[1].id, isError: true });
  renderView({ revisions: input, selectedRevisionId: null, isFetching: true });

  assert.deepEqual(input, before);
});

test("TreatmentHistory reads prepopulated data from its generated query key", () => {
  const projectId = "44444444-4444-4444-8444-444444444444";
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(
    getListCreativeProjectTreatmentsQueryKey(projectId),
    revisions,
  );

  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <TreatmentHistory projectId={projectId} />
    </QueryClientProvider>,
  );

  assert.match(html, /2 saved/);
  assert.match(html, /Viewing version 2 · Latest version/);
  assert.ok(html.includes(latestTreatment.logline));
});