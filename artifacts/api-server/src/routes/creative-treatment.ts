import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import {
  InMemoryRunner,
  LlmAgent,
} from "@google/adk";
import {
  CreateCreativeTreatmentBody,
  CreateCreativeTreatmentResponse,
  GetCreativeProjectParams,
  GetCreativeProjectResponse,
  ListCreativeProjectTreatmentsParams,
  ListCreativeProjectTreatmentsResponse,
  ListCreativeProjectsResponse,
} from "@workspace/api-zod";
import { z } from "zod/v4";
import {
  creativeProjectRepository,
  type CreativeProjectRepository,
} from "../lib/creative-project-repository";

const router: IRouter = Router();

const MODEL = "gemini-3.6-flash";
const APP_NAME = "creative-crew";
const RUN_TIMEOUT_MS = 90_000;
const WORKSPACE_COOKIE = "creative_workspace";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getWorkspaceId(req: Request, res: Response): string {
  const candidate = (req.signedCookies as Record<string, unknown> | undefined)?.[
    WORKSPACE_COOKIE
  ];
  if (typeof candidate === "string" && UUID_PATTERN.test(candidate)) {
    return candidate;
  }

  const workspaceId = randomUUID();
  res.cookie(WORKSPACE_COOKIE, workspaceId, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return workspaceId;
}

export const adkTreatmentSchema = z.object({
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

type AdkRunContext = {
  userId: string;
  sessionId: string;
};

export async function generateTreatment(
  brief: string,
  context: AdkRunContext,
): Promise<unknown> {
  const agent = createTreatmentAgent();
  const runner = new InMemoryRunner({
    agent,
    appName: APP_NAME,
  });

  await runner.sessionService.createSession({
    appName: APP_NAME,
    userId: context.userId,
    sessionId: context.sessionId,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  let finalText = "";

  try {
    for await (const event of runner.runAsync({
      userId: context.userId,
      sessionId: context.sessionId,
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

  return parsed;
}

type TreatmentGenerator = (
  brief: string,
  context: AdkRunContext,
) => Promise<unknown>;

export function createCreativeTreatmentRouter(
  treatmentGenerator: TreatmentGenerator = generateTreatment,
  repository: CreativeProjectRepository = creativeProjectRepository,
): IRouter {
  const treatmentRouter: IRouter = Router();

  treatmentRouter.get("/creative-projects", async (req, res): Promise<void> => {
    const ownerId = getWorkspaceId(req, res);
    const projects = await repository.listProjects(ownerId);
    res.json(ListCreativeProjectsResponse.parse(projects));
  });

  treatmentRouter.get(
    "/creative-projects/:projectId",
    async (req, res): Promise<void> => {
      const params = GetCreativeProjectParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: "Enter a valid project identifier." });
        return;
      }

      const ownerId = getWorkspaceId(req, res);
      const project = await repository.getProject(
        params.data.projectId,
        ownerId,
      );
      if (!project) {
        res.status(404).json({ error: "Creative project not found." });
        return;
      }

      res.json(GetCreativeProjectResponse.parse(project));
    },
  );

  treatmentRouter.get(
    "/creative-projects/:projectId/treatments",
    async (req, res): Promise<void> => {
      const params = ListCreativeProjectTreatmentsParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: "Enter a valid project identifier." });
        return;
      }

      const ownerId = getWorkspaceId(req, res);
      const project = await repository.getProject(
        params.data.projectId,
        ownerId,
      );
      if (!project) {
        res.status(404).json({ error: "Creative project not found." });
        return;
      }

      const treatments = await repository.listTreatments(
        params.data.projectId,
        ownerId,
      );
      res.json(ListCreativeProjectTreatmentsResponse.parse(treatments));
    },
  );

  treatmentRouter.post(
    "/creative-treatment",
    async (req, res): Promise<void> => {
      const input = CreateCreativeTreatmentBody.safeParse(req.body);

      if (!input.success) {
        res.status(400).json({
          error:
            "Enter a creative brief of at least 20 characters before starting the crew.",
        });
        return;
      }

      const ownerId = getWorkspaceId(req, res);
      const projectId = randomUUID();
      const sessionId = randomUUID();
      const userId = `filmmaker-${projectId}`;

      try {
        await repository.startGeneration({
          projectId,
          ownerId,
          brief: input.data.brief,
          sessionId,
          userId,
        });

        if (!process.env["GOOGLE_API_KEY"]) {
          throw new Error("GOOGLE_API_KEY is not configured");
        }

        const generated = await treatmentGenerator(input.data.brief, {
          userId,
          sessionId,
        });
        const treatment = adkTreatmentSchema.parse(generated);
        const project = await repository.completeGeneration(
          projectId,
          ownerId,
          sessionId,
          treatment,
        );
        res.status(201).json(CreateCreativeTreatmentResponse.parse(project));
      } catch (error) {
        try {
          await repository.failGeneration(projectId, ownerId, sessionId);
        } catch (persistenceError) {
          req.log.error(
            { err: persistenceError, projectId },
            "Failed to persist creative generation failure",
          );
        }

        const message = error instanceof Error ? error.message : "";
        const aborted =
          error instanceof Error &&
          (error.name === "AbortError" || error.message.includes("aborted"));
        const billingUnavailable =
          message.includes("prepayment credits are depleted") ||
          message.toLowerCase().includes("billing");
        const providerNotConfigured = message.includes(
          "GOOGLE_API_KEY is not configured",
        );

        req.log.error(
          { err: error, projectId },
          "Creative treatment generation failed",
        );
        res.status(502).json({
          error: billingUnavailable
            ? "Gemini billing credits are depleted for this Google project. Restore billing in Google AI Studio, then try again."
            : providerNotConfigured
              ? "Google AI is not configured. Add GOOGLE_API_KEY to Replit Secrets."
              : aborted
              ? "The creative crew timed out. Please try the brief again."
              : "The creative crew could not complete the treatment. Please try again.",
        });
      }
    });

  return treatmentRouter;
}

export default createCreativeTreatmentRouter();