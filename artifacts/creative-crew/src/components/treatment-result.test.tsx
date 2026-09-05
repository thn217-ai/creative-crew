import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TreatmentResult } from "./treatment-result";

test("renders an approved treatment with every field and provider attribution", () => {
  const values = {
    title: "The Last Light",
    logline: "A town protects its lighthouse.",
    centralIdea: "Shared courage.",
    emotionalDirection: "Isolation becomes hope.",
    tone: ["intimate", "urgent"],
    narrativeApproach: "One final hour.",
    visualPrinciples: ["Practical light", "Human detail"],
    audiencePromise: "Grounded cinematic hope.",
    guardrails: ["No spectacle", "No stereotypes"],
    generatedBy: "google-adk-gemini" as const,
  };

  const html = renderToStaticMarkup(<TreatmentResult data={values} />);

  assert.match(html, /TREATMENT APPROVED/);
  for (const value of Object.values(values).flat()) {
    assert.match(html, new RegExp(value));
  }
  assert.match(html, /data-testid="text-attribution"/);
});