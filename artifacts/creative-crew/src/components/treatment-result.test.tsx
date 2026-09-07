import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { CreativeTreatment } from "@workspace/api-client-react";
import { TreatmentResult } from "./treatment-result";

test("renders an approved pre-production package with every field and provider attribution", () => {
  const values: CreativeTreatment = {
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

  assert.match(html, /PRE-PRODUCTION PACKAGE APPROVED/);
  for (const value of Object.values(values).flat()) {
    assert.match(html, new RegExp(value));
  }
  assert.match(html, /data-testid="text-attribution"/);
});

test("renders every generated pre-production package section", () => {
  const data: CreativeTreatment = {
    title: "Night Shift", logline: "A night guard finds daylight.", centralIdea: "Hope endures.", emotionalDirection: "Tense and warm.", tone: ["noir"], narrativeApproach: "One night.", visualPrinciples: ["Deep shadows"], audiencePromise: "A dawn worth waiting for.", guardrails: ["No violence"], generatedBy: "google-adk-gemini",
    workflowStages: [{ specialist: "Creative Director", message: "Direction approved." }],
    projectInterpretation: "An intimate story of perseverance.", constraints: ["Single location"],
    script: { durationSeconds: 30, scenes: [{ sceneNumber: 1, timing: "0:00–0:15", action: "Mara patrols.", dialogueOrVoiceover: "Keep the light on." }] },
    visualDirection: { visualLanguage: "Natural noir", palette: ["Blue", "Gold"], environment: "Empty lobby", lightingMood: "Moonlit", compositionPrinciples: ["Negative space"], productionDesign: "Worn brass", wardrobe: "Security uniform" },
    productionPlan: { locations: ["Lobby"], talent: ["Mara"], props: ["Flashlight"], productionRequirements: ["Night shoot"], practicalNotes: ["Keep it quiet"], shots: [{ shotNumber: 1, sceneNumber: 1, framing: "Wide", action: "Mara enters", purpose: "Establish isolation" }] },
    creativeQa: { status: "NEEDS_REVISION", checks: [{ category: "continuity", status: "ISSUE", finding: "Flashlight changes hands." }], issues: ["Continuity mismatch"], corrections: ["Keep flashlight with Mara"] },
    finalPackageSummary: "Ready after the continuity correction.",
  };

  const html = renderToStaticMarkup(<TreatmentResult data={data} />);

  assert.match(html, /PRE-PRODUCTION PACKAGE NEEDS REVISION/);
  assert.doesNotMatch(html, /PRE-PRODUCTION PACKAGE APPROVED/);
  for (const value of ["Workflow Milestones", "Creative Director", "Direction approved.", "Project Overview", "An intimate story of perseverance.", "Constraints", "Single location", "Script Scenes", "30 seconds", "0:00–0:15", "Mara patrols.", "Keep the light on.", "Visual Direction", "Natural noir", "Security uniform", "Production Plan", "Night shoot", "Shot List", "Establish isolation", "Creative QA", "NEEDS_REVISION", "Flashlight changes hands.", "Continuity mismatch", "Keep flashlight with Mara", "Final Package Summary", "Ready after the continuity correction."]) {
    assert.match(html, new RegExp(value));
  }
});

test("renders legacy treatments safely without package sections", () => {
  const legacy: CreativeTreatment = {
    title: "Legacy", logline: "An older treatment.", centralIdea: "Continuity.", emotionalDirection: "Calm.", tone: [], narrativeApproach: "Simple.", visualPrinciples: [], audiencePromise: "Clarity.", guardrails: [], generatedBy: "google-adk-gemini",
  };

  const html = renderToStaticMarkup(<TreatmentResult data={legacy} />);

  assert.match(html, /PRE-PRODUCTION PACKAGE APPROVED/);
  for (const section of ["Workflow Milestones", "Project Overview", "Script Scenes", "Visual Direction", "Production Plan", "Creative QA", "Final Package Summary"]) {
    assert.doesNotMatch(html, new RegExp(section));
  }
});