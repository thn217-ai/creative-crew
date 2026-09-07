import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import {
  InMemoryRunner,
  LlmAgent,
  type LlmAgentSchema,
} from "@google/adk";
import {
  CreateCreativeTreatmentBody,
  CreateCreativeTreatmentResponse,
  ClaimCreativeWorkspaceBody,
  ClaimCreativeWorkspaceResponse,
  GetCreativeWorkspaceResponse,
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
  type OwnerContext,
} from "../lib/creative-project-repository";
import {
  getExistingWorkspaceId,
  getOrCreateWorkspaceId,
} from "../lib/creative-workspace-cookie";
import { isSameOriginJsonRequest } from "../lib/same-origin-json";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

const router: IRouter = Router();

const MODEL = "gemini-3.6-flash";
const APP_NAME = "creative-crew";
const RUN_TIMEOUT_MS = 90_000;
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

const creativeDirectorSchema = adkTreatmentSchema.extend({
  projectInterpretation: z.string(),
  constraints: z.array(z.string()),
});
const writerSchema = z.object({
  script: z.object({
    durationSeconds: z.number().int().min(1),
    scenes: z.array(z.object({
      sceneNumber: z.number().int().min(1),
      timing: z.string(),
      action: z.string(),
      dialogueOrVoiceover: z.string().nullable(),
    })).min(1),
  }),
});
const artDirectorSchema = z.object({
  visualDirection: z.object({
    visualLanguage: z.string(), palette: z.array(z.string()), environment: z.string(),
    lightingMood: z.string(), compositionPrinciples: z.array(z.string()),
    productionDesign: z.string(), wardrobe: z.string(),
  }),
});
const productionPlannerSchema = z.object({
  productionPlan: z.object({
    locations: z.array(z.string()), talent: z.array(z.string()), props: z.array(z.string()),
    productionRequirements: z.array(z.string()), practicalNotes: z.array(z.string()),
    shots: z.array(z.object({
      shotNumber: z.number().int().min(1), sceneNumber: z.number().int().min(1),
      framing: z.string(), action: z.string(), purpose: z.string(),
    })).min(1),
  }),
});
const creativeQaSchema = z.object({
  creativeQa: z.object({
    status: z.enum(["PASS", "NEEDS_REVISION"]),
    checks: z.array(z.object({
      category: z.enum(["brief_alignment", "contradictions", "narrative_consistency", "visual_consistency", "production_feasibility", "unwanted_cliches", "missing_requirements", "continuity"]),
      status: z.enum(["PASS", "ADVISORY", "ISSUE"]), finding: z.string(),
    })).min(1),
    issues: z.array(z.string()), corrections: z.array(z.string()),
  }),
  finalPackageSummary: z.string(),
});
const workflowStagesSchema = z.array(z.object({
  specialist: z.enum(["Creative Director", "Writer", "Art Director", "Production Planner", "Creative QA"]),
  message: z.string(),
})).length(5);

/** New work must be a complete crew package; older records remain readable. */
export const completeTreatmentSchema = adkTreatmentSchema
  .extend(creativeDirectorSchema.shape)
  .extend(writerSchema.shape)
  .extend(artDirectorSchema.shape)
  .extend(productionPlannerSchema.shape)
  .extend(creativeQaSchema.shape)
  .extend({ workflowStages: workflowStagesSchema });

function createTreatmentAgent(
  name: string,
  description: string,
  instruction: string,
  outputSchema: LlmAgentSchema,
  maxOutputTokens: number,
) {
  return new LlmAgent({
    name,
    model: MODEL,
    description,
    instruction,
    outputSchema,
    includeContents: "none",
    generateContentConfig: {
      temperature: 0.55,
      maxOutputTokens,
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
  const runStage = async <T>(
    specialist: string,
    description: string,
    instruction: string,
    outputSchema: z.ZodType<T> & LlmAgentSchema,
    input: unknown,
    maxOutputTokens = 2400,
  ): Promise<T> => {
    const stageId = specialist.toLowerCase().replaceAll(" ", "-");
    const runner = new InMemoryRunner({
      agent: createTreatmentAgent(
        stageId,
        description,
        instruction,
        outputSchema,
        maxOutputTokens,
      ),
      appName: APP_NAME,
    });
    const sessionId = `${context.sessionId}-${stageId}`;
    await runner.sessionService.createSession({
      appName: APP_NAME, userId: context.userId, sessionId,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    let finalText = "";
    try {
      for await (const event of runner.runAsync({
        userId: context.userId,
        sessionId,
        newMessage: { role: "user", parts: [{ text: JSON.stringify(input) }] },
        abortSignal: controller.signal,
      })) {
        if (event.errorMessage) throw new Error(event.errorMessage);
        const text = (event.content?.parts ?? [])
          .map((part) => ("text" in part ? part.text : ""))
          .filter(Boolean).join("");
        if (text) finalText = text;
      }
    } finally {
      clearTimeout(timeout);
    }
    if (!finalText) throw new Error(`Gemini returned no ${specialist} output.`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(finalText);
    } catch {
      throw new Error(`Gemini returned malformed ${specialist} output.`);
    }
    return outputSchema.parse(parsed);
  };

  const director = await runStage(
    "Creative Director",
    "A senior creative director who creates decisive production-aware treatments.",
    "Return only the specified structured creative direction. Faithfully interpret the brief, avoid stereotypes and generic language, and set generatedBy to google-adk-gemini.",
    creativeDirectorSchema, { brief },
  );
  const writer = await runStage(
    "Writer",
    "A screenwriter who turns approved creative direction into an executable script.",
    "Return only the specified structured script. Treat supplied creative direction as authoritative.",
    writerSchema, { brief, creativeDirection: director },
  );
  const artDirector = await runStage(
    "Art Director",
    "An art director who makes practical visual direction from the approved script.",
    "Return only the specified structured visual direction. Respect supplied creative direction and script.",
    artDirectorSchema, { brief, creativeDirection: director, script: writer.script },
  );
  const productionPlanner = await runStage(
    "Production Planner",
    "A production planner who creates feasible shooting plans.",
    "Return only the specified structured production plan. Map shots to supplied script scenes.",
    productionPlannerSchema,
    { brief, creativeDirection: director, script: writer.script, visualDirection: artDirector.visualDirection },
    4000,
  );
  const qa = await runStage(
    "Creative QA",
    "A creative QA specialist who verifies complete production packages.",
    "Return only the specified QA report and package summary. Check supplied work against the brief without revealing reasoning.",
    creativeQaSchema,
    { brief, creativeDirection: director, script: writer.script, visualDirection: artDirector.visualDirection, productionPlan: productionPlanner.productionPlan },
    3200,
  );

  return completeTreatmentSchema.parse({
    ...director, ...writer, ...artDirector, ...productionPlanner, ...qa,
    workflowStages: [
      { specialist: "Creative Director", message: "Creative direction complete." },
      { specialist: "Writer", message: "Script complete." },
      { specialist: "Art Director", message: "Visual direction complete." },
      { specialist: "Production Planner", message: "Production plan complete." },
      { specialist: "Creative QA", message: "Creative QA complete." },
    ],
  });
}

type TreatmentGenerator = (
  brief: string,
  context: AdkRunContext,
) => Promise<unknown>;

export type VerifiedAuthResolver = (req: Request) => {
  userId: string | null;
};

const resolveVerifiedAuth: VerifiedAuthResolver = (req) => ({
  userId: getAuth(req).userId,
});

function getReadOwner(
  req: Request,
  res: Response,
  authResolver: VerifiedAuthResolver,
): OwnerContext {
  const accountUserId = authResolver(req).userId;
  return accountUserId
    ? { kind: "account", accountUserId }
    : { kind: "guest", workspaceId: getOrCreateWorkspaceId(req, res) };
}

export function createCreativeTreatmentRouter(
  treatmentGenerator: TreatmentGenerator = generateTreatment,
  repository: CreativeProjectRepository = creativeProjectRepository,
  authResolver: VerifiedAuthResolver = resolveVerifiedAuth,
  canonicalHostResolver: (req: Request) => string | undefined =
    getClerkProxyHost,
): IRouter {
  const treatmentRouter: IRouter = Router();

  treatmentRouter.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  treatmentRouter.get(
    "/creative-workspace",
    async (req, res): Promise<void> => {
      const signedIn = Boolean(authResolver(req).userId);
      const workspaceId = getExistingWorkspaceId(req);
      const unclaimedProjectCount = workspaceId
        ? await repository.countUnclaimedProjects(workspaceId)
        : 0;
      res.json(
        GetCreativeWorkspaceResponse.parse({
          signedIn,
          unclaimedProjectCount,
        }),
      );
    },
  );

  treatmentRouter.post(
    "/creative-workspace/claim",
    async (req, res): Promise<void> => {
      const input = ClaimCreativeWorkspaceBody.safeParse(req.body);
      if (!input.success) {
        res.status(400).json({ error: "Confirm the workspace claim." });
        return;
      }

      const accountUserId = authResolver(req).userId;
      if (!accountUserId) {
        res.status(401).json({ error: "Sign in before saving this workspace." });
        return;
      }

      const canonicalHost = canonicalHostResolver(req);
      if (
        !canonicalHost ||
        !isSameOriginJsonRequest(req, canonicalHost)
      ) {
        res.status(403).json({ error: "Cross-site request rejected." });
        return;
      }

      const workspaceId = getExistingWorkspaceId(req);
      if (!workspaceId) {
        res.status(403).json({ error: "A valid browser workspace is required." });
        return;
      }

      const claimedProjectCount = await repository.claimWorkspace(
        workspaceId,
        accountUserId,
      );
      res.json(
        ClaimCreativeWorkspaceResponse.parse({ claimedProjectCount }),
      );
    },
  );

  treatmentRouter.get("/creative-projects", async (req, res): Promise<void> => {
    const owner = getReadOwner(req, res, authResolver);
    const projects = await repository.listProjects(owner);
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

      const owner = getReadOwner(req, res, authResolver);
      const project = await repository.getProject(
        params.data.projectId,
        owner,
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

      const owner = getReadOwner(req, res, authResolver);
      const project = await repository.getProject(
        params.data.projectId,
        owner,
      );
      if (!project) {
        res.status(404).json({ error: "Creative project not found." });
        return;
      }

      const treatments = await repository.listTreatments(
        params.data.projectId,
        owner,
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

      const canonicalHost = canonicalHostResolver(req);
      if (!canonicalHost || !isSameOriginJsonRequest(req, canonicalHost)) {
        res.status(403).json({ error: "Cross-site request rejected." });
        return;
      }

      const workspaceId = getOrCreateWorkspaceId(req, res);
      const accountUserId = authResolver(req).userId;
      const projectId = randomUUID();
      const sessionId = randomUUID();
      const userId = `filmmaker-${projectId}`;

      try {
        await repository.startGeneration({
          projectId,
          owner: { workspaceId, accountUserId },
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
        const treatment = completeTreatmentSchema.parse(generated);
        const project = await repository.completeGeneration(
          projectId,
          workspaceId,
          sessionId,
          treatment,
        );
        res.status(201).json(CreateCreativeTreatmentResponse.parse(project));
      } catch (error) {
        try {
          await repository.failGeneration(projectId, workspaceId, sessionId);
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