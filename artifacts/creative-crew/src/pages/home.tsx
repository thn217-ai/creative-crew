import { useForm } from "react-hook-form";
import { Clapperboard, Film, Sparkles, Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { TreatmentResult } from "@/components/treatment-result";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateCreativeTreatment } from "@workspace/api-client-react";

type BriefFormValues = {
  brief: string;
};

export default function Home() {
  const { mutate, isPending, error, data } = useCreateCreativeTreatment();

  const form = useForm<BriefFormValues>({
    defaultValues: {
      brief: "",
    },
  });

  const onSubmit = (values: BriefFormValues) => {
    mutate({ data: values });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full bg-background font-sans">
      {/* Left Pane - Script Desk */}
      <div className="w-full md:w-1/2 lg:w-5/12 border-r border-border p-8 md:p-12 flex flex-col h-[100dvh] overflow-y-auto relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        
        <div className="relative z-10 flex flex-col h-full max-w-xl mx-auto w-full">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <Clapperboard className="text-primary-foreground w-5 h-5" />
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight">Creative Crew</h1>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Submit your raw creative brief. Our digital production team will synthesize a structured treatment, ready for pre-production.
            </p>
          </header>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-6">
              <FormField
                control={form.control}
                name="brief"
                rules={{
                  required: "A creative brief is required",
                  minLength: {
                    value: 20,
                    message: "Brief must be at least 20 characters",
                  },
                  maxLength: {
                    value: 5000,
                    message: "Brief must be under 5000 characters",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col gap-2">
                    <FormLabel className="font-semibold text-sm uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                      <span>Director's Notes</span>
                      <span className="text-muted-foreground font-normal normal-case text-xs">(The Brief)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the vision. What's the story? Who is it for? What is the core emotion we're trying to evoke?"
                        className="flex-1 min-h-[300px] resize-none font-serif text-lg leading-relaxed bg-transparent border-t border-b border-l-0 border-r-0 rounded-none px-0 py-6 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50 transition-colors"
                        data-testid="input-brief"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-auto pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
                  SYSTEM ONLINE
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isPending}
                  className="rounded-full px-8 gap-2 uppercase tracking-widest font-semibold text-xs transition-transform active:scale-95 w-full sm:w-auto"
                  data-testid="button-submit"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      Generate Treatment
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Right Pane - Screening Room (Dark Mode Context) */}
      <div className="w-full md:w-1/2 lg:w-7/12 dark bg-background text-foreground h-[100dvh] overflow-y-auto relative flex flex-col">
        <div className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-7/12 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-0 mix-blend-multiply opacity-50"></div>
        
        <div className="relative z-10 flex-1 p-8 md:p-16 max-w-4xl mx-auto w-full flex flex-col">
          {error && (
            <div className="mb-8 p-6 bg-destructive/10 border border-destructive/20 rounded-lg flex flex-col gap-2">
              <h3 className="text-destructive font-bold text-lg">System Fault</h3>
              <p className="text-destructive/80 text-sm">
                {error.data?.error || "Failed to generate treatment."}
              </p>
            </div>
          )}

          {!data && !isPending && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50 space-y-6">
              <Film className="w-16 h-16 text-muted-foreground stroke-[1]" />
              <div className="space-y-2">
                <h3 className="font-serif text-2xl">Awaiting Directives</h3>
                <p className="text-muted-foreground text-sm">
                  The screening room is empty. Submit a brief to generate a structured creative treatment.
                </p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-12 animate-in fade-in duration-1000">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-mono text-sm uppercase tracking-widest">Google ADK / Gemini</span>
                </div>
                <h2 className="text-3xl font-serif font-bold text-foreground">Synthesizing Vision...</h2>
              </div>
              
              <div className="space-y-8">
                {[
                  { width: "w-3/4", delay: "delay-0" },
                  { width: "w-full", delay: "delay-150" },
                  { width: "w-5/6", delay: "delay-300" },
                  { width: "w-2/3", delay: "delay-500" },
                ].map((skel, i) => (
                  <div key={i} className={`space-y-2 animate-in fade-in slide-in-from-bottom-4 ${skel.delay} fill-mode-both`}>
                    <Skeleton className="h-4 w-24 bg-muted/20" />
                    <Skeleton className={`h-6 ${skel.width} bg-muted/10`} />
                    <Skeleton className={`h-6 ${skel.width} bg-muted/10 opacity-50`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {data && !isPending && (
            <TreatmentResult data={data} />
          )}
        </div>
      </div>
    </div>
  );
}