import * as React from "react";
import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CreativeTreatment } from "@workspace/api-client-react";

export function TreatmentResult({ data }: { data: CreativeTreatment }) {
  const needsRevision = data.creativeQa?.status === "NEEDS_REVISION";

  return (
    <div className="flex-1 space-y-16 animate-in fade-in zoom-in-95 duration-700 pb-12 mt-8">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-mono tracking-widest">
          <Video className="w-3 h-3" />
          {needsRevision
            ? "PRE-PRODUCTION PACKAGE NEEDS REVISION"
            : "PRE-PRODUCTION PACKAGE APPROVED"}
        </div>
        <h1 className="text-5xl md:text-6xl font-serif font-bold leading-tight tracking-tight" data-testid="text-title">{data.title}</h1>
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-serif italic border-l-4 border-primary pl-6 py-2" data-testid="text-logline">{data.logline}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Central Idea</h3><p className="text-lg leading-relaxed text-foreground/90" data-testid="text-central-idea">{data.centralIdea}</p></div>
        <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Narrative Approach</h3><p className="text-lg leading-relaxed text-foreground/90" data-testid="text-narrative-approach">{data.narrativeApproach}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Emotional Direction</h3><p className="text-foreground/90 leading-relaxed" data-testid="text-emotional-direction">{data.emotionalDirection}</p></div>
          <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Tone</h3><div className="flex flex-wrap gap-2" data-testid="list-tone">{data.tone.map((item) => <Badge key={item} variant="secondary" className="bg-secondary/50 font-mono text-xs">{item}</Badge>)}</div></div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Audience Promise</h3><p className="text-foreground/90 leading-relaxed" data-testid="text-audience-promise">{data.audiencePromise}</p></div>
          <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Guardrails</h3><ul className="space-y-3" data-testid="list-guardrails">{data.guardrails.map((item) => <li className="text-sm text-muted-foreground" key={item}>× {item}</li>)}</ul></div>
        </div>
      </div>
      <div className="space-y-6 bg-secondary/10 p-8 rounded-xl border border-border/50">
        <h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Visual Principles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-testid="list-visual-principles">{data.visualPrinciples.map((item) => <p className="text-sm leading-relaxed text-foreground/90" key={item}>• {item}</p>)}</div>
      </div>
      {data.workflowStages && (
        <div className="space-y-6">
          <h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Workflow Milestones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="list-workflow-milestones">
            {data.workflowStages.map((stage) => <div className="space-y-2 border-l-2 border-primary/30 pl-4" key={`${stage.specialist}-${stage.message}`}><p className="text-xs font-mono uppercase tracking-wider text-primary">{stage.specialist}</p><p className="text-sm text-foreground/90">{stage.message}</p></div>)}
          </div>
        </div>
      )}
      {(data.projectInterpretation !== undefined || data.constraints !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {data.projectInterpretation !== undefined && <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Project Overview</h3><p className="text-foreground/90 leading-relaxed" data-testid="text-project-overview">{data.projectInterpretation}</p></div>}
          {data.constraints !== undefined && <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Constraints</h3><ul className="space-y-3" data-testid="list-constraints">{data.constraints.map((item) => <li className="text-sm text-muted-foreground" key={item}>× {item}</li>)}</ul></div>}
        </div>
      )}
      {data.script && (
        <div className="space-y-6 bg-secondary/10 p-8 rounded-xl border border-border/50" data-testid="section-script">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Script Scenes</h3><p className="text-xs font-mono text-muted-foreground">{data.script.durationSeconds} seconds</p></div>
          <div className="space-y-6">{data.script.scenes.map((scene) => <div className="space-y-3 border-l-2 border-primary/30 pl-4" key={scene.sceneNumber}><p className="text-xs font-mono uppercase tracking-wider text-primary">Scene {scene.sceneNumber} · {scene.timing}</p><p className="text-sm text-foreground/90"><span className="font-semibold">Action:</span> {scene.action}</p>{scene.dialogueOrVoiceover && <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground/90">Dialogue / VO:</span> {scene.dialogueOrVoiceover}</p>}</div>)}</div>
        </div>
      )}
      {data.visualDirection && (
        <div className="space-y-6">
          <h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Visual Direction</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-foreground/90" data-testid="section-visual-direction">
            <p><span className="font-semibold">Visual language:</span> {data.visualDirection.visualLanguage}</p><p><span className="font-semibold">Palette:</span> {data.visualDirection.palette.join(", ")}</p><p><span className="font-semibold">Environment:</span> {data.visualDirection.environment}</p><p><span className="font-semibold">Lighting mood:</span> {data.visualDirection.lightingMood}</p><p><span className="font-semibold">Composition:</span> {data.visualDirection.compositionPrinciples.join(", ")}</p><p><span className="font-semibold">Production design:</span> {data.visualDirection.productionDesign}</p><p><span className="font-semibold">Wardrobe:</span> {data.visualDirection.wardrobe}</p>
          </div>
        </div>
      )}
      {data.productionPlan && (
        <div className="space-y-6">
          <h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Production Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-foreground/90" data-testid="section-production-plan">
            <p><span className="font-semibold">Locations:</span> {data.productionPlan.locations.join(", ")}</p><p><span className="font-semibold">Talent:</span> {data.productionPlan.talent.join(", ")}</p><p><span className="font-semibold">Props:</span> {data.productionPlan.props.join(", ")}</p><p><span className="font-semibold">Requirements:</span> {data.productionPlan.productionRequirements.join(", ")}</p><p className="sm:col-span-2"><span className="font-semibold">Practical notes:</span> {data.productionPlan.practicalNotes.join(", ")}</p>
          </div>
          <div className="space-y-4"><h4 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Shot List</h4><div className="space-y-3" data-testid="list-shot-list">{data.productionPlan.shots.map((shot) => <div className="text-sm border-l-2 border-primary/30 pl-4" key={shot.shotNumber}><span className="font-semibold">Shot {shot.shotNumber} / Scene {shot.sceneNumber}:</span> {shot.framing} — {shot.action} <span className="text-muted-foreground">({shot.purpose})</span></div>)}</div></div>
        </div>
      )}
      {data.creativeQa && (
        <div className="space-y-6 bg-secondary/10 p-8 rounded-xl border border-border/50" data-testid="section-creative-qa">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Creative QA</h3><Badge variant="secondary" className="font-mono text-xs">{data.creativeQa.status}</Badge></div>
          <div className="space-y-3" data-testid="list-creative-qa-checks">{data.creativeQa.checks.map((check) => <p className="text-sm text-foreground/90" key={`${check.category}-${check.finding}`}><span className="font-semibold">{check.category} · {check.status}:</span> {check.finding}</p>)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"><div><h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Issues</h4><ul className="space-y-2" data-testid="list-creative-qa-issues">{data.creativeQa.issues.map((issue) => <li key={issue}>× {issue}</li>)}</ul></div><div><h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Corrections</h4><ul className="space-y-2" data-testid="list-creative-qa-corrections">{data.creativeQa.corrections.map((correction) => <li key={correction}>• {correction}</li>)}</ul></div></div>
        </div>
      )}
      {data.finalPackageSummary !== undefined && <div className="space-y-4"><h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Final Package Summary</h3><p className="text-lg leading-relaxed text-foreground/90" data-testid="text-final-package-summary">{data.finalPackageSummary}</p></div>}
      <div className="flex justify-end pt-8 border-t border-border/30">
        <div className="text-xs font-mono text-muted-foreground bg-secondary/20 px-3 py-1.5 rounded-full">
        Synthesized by <span className="text-foreground font-semibold" data-testid="text-attribution">{data.generatedBy}</span>
        </div>
      </div>
    </div>
  );
}