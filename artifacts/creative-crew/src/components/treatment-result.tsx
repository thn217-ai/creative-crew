import * as React from "react";
import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CreativeTreatment } from "@workspace/api-client-react";

export function TreatmentResult({ data }: { data: CreativeTreatment }) {
  return (
    <div className="flex-1 space-y-16 animate-in fade-in zoom-in-95 duration-700 pb-12 mt-8">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-mono tracking-widest">
          <Video className="w-3 h-3" />
          TREATMENT APPROVED
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
      <div className="flex justify-end pt-8 border-t border-border/30">
        <div className="text-xs font-mono text-muted-foreground bg-secondary/20 px-3 py-1.5 rounded-full">
        Synthesized by <span className="text-foreground font-semibold" data-testid="text-attribution">{data.generatedBy}</span>
        </div>
      </div>
    </div>
  );
}