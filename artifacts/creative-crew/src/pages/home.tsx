import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk, useUser } from "@clerk/react";
import {
  ArrowRight,
  Clapperboard,
  Film,
  FolderOpen,
  Loader2,
  Sparkles,
  User as UserIcon,
  LogOut,
  LogIn,
  Save
} from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { TreatmentResult } from "@/components/treatment-result";
import { trackEvent } from "@/lib/analytics";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  getGetCreativeProjectQueryKey,
  getListCreativeProjectsQueryKey,
  getGetCreativeWorkspaceQueryKey,
  useCreateCreativeTreatment,
  useGetCreativeProject,
  useListCreativeProjects,
  useGetCreativeWorkspace,
  useClaimCreativeWorkspace
} from "@workspace/api-client-react";

type BriefFormValues = {
  brief: string;
};

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [signOutError, setSignOutError] = useState(false);

  const { signOut } = useClerk();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const basePath = import.meta.env?.BASE_URL?.replace(/\/$/, '') || '';

  const workspace = useGetCreativeWorkspace({
    query: {
      queryKey: getGetCreativeWorkspaceQueryKey(),
      enabled: isUserLoaded,
      refetchInterval: 30_000,
    },
  });

  const isSessionValid = isUserLoaded && workspace.isSuccess && (isSignedIn === workspace.data.signedIn);

  const createTreatment = useCreateCreativeTreatment();

  const projectHistory = useListCreativeProjects({
    query: {
      queryKey: getListCreativeProjectsQueryKey(),
      enabled: isSessionValid,
      staleTime: 10_000,
      refetchInterval: 30_000,
    }
  });

  const selectedProject = useGetCreativeProject(selectedProjectId, {
    query: {
      queryKey: getGetCreativeProjectQueryKey(selectedProjectId),
      enabled: Boolean(selectedProjectId) && isSessionValid,
      refetchInterval: 30_000,
    },
  });

  const claimWorkspace = useClaimCreativeWorkspace({
    mutation: {
      onSuccess: (result) => {
        trackEvent({ name: "project_claim_succeeded", claimedProjectCount: result.claimedProjectCount });
      },
      onError: () => {
        trackEvent({ name: "project_claim_failed" });
      },
    },
  });

  const form = useForm<BriefFormValues>({
    defaultValues: {
      brief: "",
    },
  });

  useEffect(() => {
    if (isSessionValid && !selectedProjectId && projectHistory.data?.[0]) {
      setSelectedProjectId(projectHistory.data[0].id);
    }
  }, [isSessionValid, projectHistory.data, selectedProjectId]);

  const onSubmit = (values: BriefFormValues) => {
    if (!isSessionValid) return;
    createTreatment.mutate(
      { data: values },
      {
        onSuccess: (project) => {
          queryClient.setQueryData(
            getGetCreativeProjectQueryKey(project.id),
            project,
          );
          void queryClient.invalidateQueries({
            queryKey: getListCreativeProjectsQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetCreativeWorkspaceQueryKey(),
          });
          setSelectedProjectId(project.id);
        },
      },
    );
  };

  const handleClaim = () => {
    if (!isSessionValid || !isSignedIn) return;
    claimWorkspace.mutate(
      { data: { confirm: true } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetCreativeWorkspaceQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getListCreativeProjectsQueryKey() });
        }
      }
    );
  };

  const openProject = (projectId: string, brief: string) => {
    setSelectedProjectId(projectId);
    form.setValue("brief", brief);
  };

  const displayedProject = isSessionValid ? selectedProject.data : undefined;
  const treatment = displayedProject?.treatment;
  const isPending = createTreatment.isPending;
  const error = createTreatment.error ?? selectedProject.error;

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full bg-background font-sans">
      {/* Left Pane - Script Desk */}
      <div className="w-full md:w-1/2 lg:w-5/12 border-r border-border p-8 md:p-12 flex flex-col h-[100dvh] overflow-y-auto relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        
        <div className="relative z-10 flex flex-col h-full max-w-xl mx-auto w-full">
          <header className="mb-10 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                  <Clapperboard className="text-primary-foreground w-5 h-5" />
                </div>
                <h1 className="text-2xl font-serif font-bold tracking-tight">Creative Crew</h1>
              </div>

              {isUserLoaded && (
                <div className="flex max-w-full items-center text-sm font-medium border border-border/60 rounded-full px-3 py-1.5 bg-background">
                  {isSignedIn ? (
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-foreground/80">
                        <UserIcon className="w-4 h-4 shrink-0 text-primary" />
                        <span className="truncate" data-testid="account-identity">{user.primaryEmailAddress?.emailAddress || user.fullName || "Account"}</span>
                      </span>
                      <div className="w-px h-4 bg-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setSignOutError(false);
                          void signOut({ redirectUrl: basePath || "/" }).catch(() => setSignOutError(true));
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                        data-testid="button-sign-out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Link href="/sign-in" onClick={() => trackEvent({ name: "account_entry_clicked", entry: "sign_in" })} className="text-foreground/80 hover:text-foreground flex items-center gap-1.5 transition-colors" data-testid="link-sign-in">
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In
                      </Link>
                      <div className="w-px h-4 bg-border" />
                      <Link href="/sign-up" onClick={() => trackEvent({ name: "account_entry_clicked", entry: "sign_up" })} className="text-primary hover:text-primary/80 transition-colors" data-testid="link-sign-up">
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              Submit your raw creative brief. Our digital production team will synthesize a structured treatment, ready for pre-production.
            </p>
          </header>

          {signOutError && <p role="alert" className="mb-4 text-sm text-destructive">Sign-out failed. Please try again.</p>}
          {!isSessionValid && (
            <div role="status" className="mb-6 rounded-lg border border-border p-4 text-sm">
              <p>{workspace.isLoading
                ? "Checking your workspace…"
                : "Your workspace session could not be verified. Retry, or sign out and sign in again."}</p>
              {!workspace.isLoading && (
                <Button type="button" variant="outline" size="sm" className="mt-3" disabled={workspace.isFetching} onClick={() => void workspace.refetch()}>
                  Retry connection
                </Button>
              )}
            </div>
          )}
          {claimWorkspace.isSuccess && isSessionValid && (
            <p role="status" className="mb-6 text-sm text-primary" data-testid="claim-success">
              {claimWorkspace.data.claimedProjectCount > 0
                ? `${claimWorkspace.data.claimedProjectCount} browser project${claimWorkspace.data.claimedProjectCount === 1 ? "" : "s"} saved to your account. You can now reopen them on another device.`
                : "No unclaimed browser projects remain. Your account library is up to date."}
            </p>
          )}
          {isSignedIn && isSessionValid && (workspace.data?.unclaimedProjectCount ?? 0) > 0 && (
            <div className="mb-8 p-4 bg-secondary/30 border border-secondary rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <FolderOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Unclaimed Projects Detected</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have {workspace.data?.unclaimedProjectCount} project{workspace.data?.unclaimedProjectCount === 1 ? '' : 's'} saved in this browser. Save them to this account to open them anywhere. They will no longer be available to guests after you sign out.
                  </p>

                  {claimWorkspace.isError && (
                    <p className="text-xs text-destructive mt-2">
                      Failed to save projects. Please try again.
                    </p>
                  )}
                </div>
              </div>
                <div className="mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={handleClaim}
                    disabled={claimWorkspace.isPending}
                    className="h-auto w-full gap-2 whitespace-normal py-2 text-xs"
                    data-testid="button-claim-projects"
                  >
                    {claimWorkspace.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save browser projects to my account
                  </Button>
                </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-6 min-h-[390px]">
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
                  {isUserLoaded && !isSessionValid && workspace.data ? "SESSION SYNCING" : "SYSTEM ONLINE"}
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isPending || !isSessionValid}
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

          <section className="mt-8 border-t border-border pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/80">
                <FolderOpen className="h-4 w-4" />
                {isSignedIn ? "My projects" : "Browser projects"}
              </h2>
              {isSessionValid && projectHistory.data && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {projectHistory.data.length} saved
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {isSignedIn
                ? "Private to your account. Sign in on another device to pick up where you left off."
                : "Saved in this browser only. Sign in and save them to your account before clearing browser data."}
            </p>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {projectHistory.isLoading && isSessionValid && (
                <Skeleton className="h-14 w-full" />
              )}
              {projectHistory.isError && (
                <p className="text-xs text-destructive">
                  Saved projects could not be loaded.
                </p>
              )}
              {isUserLoaded && !isSessionValid && workspace.data && (
                <p className="text-xs text-muted-foreground">
                  Synchronizing secure session...
                </p>
              )}
              {isSessionValid && projectHistory.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Completed and attempted treatments will appear here.
                </p>
              )}
              {isSessionValid && projectHistory.data?.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project.id, project.brief)}
                  className={`w-full border px-3 py-2.5 text-left transition-colors ${
                    selectedProjectId === project.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70 hover:border-primary/30 hover:bg-muted/40"
                  }`}
                >
                  <span className="block truncate font-serif text-sm font-semibold">
                    {project.treatment?.title ??
                      (project.status === "failed"
                        ? "Generation unsuccessful"
                        : "Treatment in progress")}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{project.status}</span>
                    <time dateTime={project.createdAt}>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </time>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Right Pane - Screening Room (Dark Mode Context) */}
      <div className="w-full md:w-1/2 lg:w-7/12 dark bg-background text-foreground h-[100dvh] overflow-y-auto relative flex flex-col">
        <div className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-7/12 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-0 mix-blend-multiply opacity-50"></div>
        
        <div className="relative z-10 flex-1 p-8 md:p-16 max-w-4xl mx-auto w-full flex flex-col">
          {error && (
            <div role="alert" className="mb-8 p-6 bg-destructive/10 border border-destructive/20 rounded-lg flex flex-col gap-2">
              <h3 className="text-destructive font-bold text-lg">System Fault</h3>
              <p className="text-destructive/80 text-sm">
                {error.data?.error || "Failed to generate treatment."}
              </p>
            </div>
          )}

          {!treatment && !isPending && !selectedProject.isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50 space-y-6">
              <Film className="w-16 h-16 text-muted-foreground stroke-[1]" />
              <div className="space-y-2">
                <h3 className="font-serif text-2xl">
                  {displayedProject?.status === "failed"
                    ? "Treatment Unavailable"
                    : "Awaiting Directives"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {displayedProject?.status === "failed"
                    ? "This brief was saved, but the crew could not complete a validated treatment."
                    : "The screening room is empty. Submit a brief to generate a structured creative treatment."}
                </p>
              </div>
            </div>
          )}

          {(isPending || selectedProject.isLoading) && (
            <div role="status" aria-label="Treatment progress" aria-live="polite" className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-12 animate-in fade-in duration-1000">
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

          {treatment && !isPending && (
            <TreatmentResult data={treatment} />
          )}
        </div>
      </div>
    </div>
  );
}