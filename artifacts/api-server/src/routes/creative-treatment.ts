import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  InMemoryRunner,
  LlmAgent,
} from "@google/adk";
import {
  CreateCreativeTreatmentBody,
  CreateCreativeTreatmentResponse,
} from "@workspace/api-zod";
import { z } from "zod/v4";

const router: IRouter = Router();

const MODEL = "gemini-3.6-flash";
const APP_NAME = "creative-crew";
const RUN_TIMEOUT_MS = 90_000;

const adkTreatmentSchema = z.object({
  title: z.string(),
  logline: z.string(),
  centralIdea: z.string(),
  emotionalDirection: z.string(),
  tone: z.array(z.string()),
  narrativeApproach: z.string(),
  visualPrinciples: z.array(z.string()),
  audiencePromise: z.string(),
  guardrails: z.array(z.string()),
  generatedBy: z.literal("google-adk-gemini"),
});

function createTreatmentAgent() {
  return new LlmAgent({
    name: "creative_director",
    model: MODEL,
    description:
      "A senior creative director who turns film briefs into coherent creative treatments.",
    instruction: [
      "You are the Creative Director inside Creative Crew, a professional pre-production organization.",
      "Interpret the filmmaker's brief faithfully and return one decisive, production-aware creative treatment.",
      "Avoid stereotypes, generic AI language, unsupported claims, and lists of alternative concepts.",
      "Make every field specific enough to guide a writer, art director, and production planner downstream.",
      "The generatedBy field must always be exactly google-adk-gemini.",
    ].join(" "),
    outputSchema: adkTreatmentSchema,
    includeContents: "none",
    generateContentConfig: {
      temperature: 0.75,
      maxOutputTokens: 2400,
    },
  });
}

async function generateTreatment(brief: string) {
  const agent = createTreatmentAgent();
  const runner = new InMemoryRunner({
    agent,
    appName: APP_NAME,
  });

  const userId = `filmmaker-${randomUUID()}`;
  const sessionId = randomUUID();
  await runner.sessionService.createSession({
    appName: APP_NAME,
    userId,
    sessionId,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  let finalText = "";

  try {
    for await (const event of runner.runAsync({
      userId,
      sessionId,
      newMessage: {
        role: "user",
        parts: [{ text: brief }],
      },
      abortSignal: controller.signal,
    })) {
      if (event.errorMessage) {
        throw new Error(event.errorMessage);
      }

      const eventText = (event.content?.parts ?? [])
        .map((part) => ("text" in part ? part.text : ""))
        .filter(Boolean)
        .join("");

      if (eventText) finalText = eventText;
    }
  } finally {
    clearTimeout(timeout);
  }

  if (!finalText) {
    throw new Error("Gemini returned no final treatment.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(finalText);
  } catch {
    throw new Error("Gemini returned malformed structured output.");
  }

  return CreateCreativeTreatmentResponse.parse(parsed);
}

router.post("/creative-treatment", async (req, res) => {
  const input = CreateCreativeTreatmentBody.safeParse(req.body);

  if (!input.success) {
    res.status(400).json({
      error:
        "Enter a creative brief of at least 20 characters before starting the crew.",
    });
    return;
  }

  if (!process.env["GOOGLE_API_KEY"]) {
    req.log.error("GOOGLE_API_KEY is not configured");
    res.status(502).json({
      error:
        "Google AI is not configured. Add GOOGLE_API_KEY to Replit Secrets.",
    });
    return;
  }

  try {
    const treatment = await generateTreatment(input.data.brief);
    res.json(treatment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"));
    const billingUnavailable =
      message.includes("prepayment credits are depleted") ||
      message.toLowerCase().includes("billing");

    req.log.error({ err: error }, "Creative treatment generation failed");
    res.status(502).json({
      error: billingUnavailable
        ? "Gemini billing credits are depleted for this Google project. Restore billing in Google AI Studio, then try again."
        : aborted
          ? "The creative crew timed out. Please try the brief again."
          : "The creative crew could not complete the treatment. Please try again.",
    });
  }
});

export default router;