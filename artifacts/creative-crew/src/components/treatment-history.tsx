import * as React from "react";
import { History, Loader2 } from "lucide-react";
import {
  getListCreativeProjectTreatmentsQueryKey,
  useListCreativeProjectTreatments,
  type CreativeTreatmentRevision,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { TreatmentResult } from "@/components/treatment-result";

export function TreatmentHistory({ projectId }: { projectId: string }) {
  const [selectedRevisionId, setSelectedRevisionId] = React.useState<string | null>(null);
  const history = useListCreativeProjectTreatments(projectId, {
    query: {
      queryKey: getListCreativeProjectTreatmentsQueryKey(projectId),
      refetchInterval: 30_000,
    },
  });

  return (
    <TreatmentHistoryView
      revisions={history.data}
      selectedRevisionId={selectedRevisionId}
      onSelectRevision={setSelectedRevisionId}
      isPending={history.isPending}
      isError={history.isError}
      isFetching={history.isFetching}
      onRetry={() => void history.refetch()}
    />
  );
}

type TreatmentHistoryViewProps = {
  revisions?: CreativeTreatmentRevision[];
  selectedRevisionId: string | null;
  onSelectRevision: (revisionId: string | null) => void;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
};

export function TreatmentHistoryView({
  revisions,
  selectedRevisionId,
  onSelectRevision,
  isPending,
  isError,
  isFetching,
  onRetry,
}: TreatmentHistoryViewProps) {
  // The API returns validated treatment records newest-first. Never sort its cached data in place.
  const latestRevision = revisions?.[0];
  const selectedRevision = selectedRevisionId === null
    ? latestRevision
    : revisions?.find((revision) => revision.id === selectedRevisionId);
  const isOlderVersion = Boolean(selectedRevision && selectedRevision.id !== latestRevision?.id);
  const versionNumber = selectedRevision && revisions
    ? revisions.findIndex((revision) => revision.id === selectedRevision.id)
    : -1;
  const hasMultipleTreatments = Boolean(revisions && revisions.length > 1);

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <section aria-labelledby="treatment-history-heading" className="rounded-lg border border-border bg-secondary/10 p-4 space-y-3">
        <h2 id="treatment-history-heading" className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
          <History className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Saved treatment
          {revisions && (
            <span className="ml-auto text-muted-foreground" data-testid="text-version-count">
              {revisions.length} saved
            </span>
          )}
        </h2>

        {isPending && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="status-versions-loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading saved treatment…
          </p>
        )}

        {isError && (
          <div role="alert" className="space-y-3" data-testid="status-versions-error">
            <p className="text-sm text-destructive">
              {revisions
                ? "Could not refresh saved treatments. Showing previously loaded data."
                : "Could not load the saved treatment. Your project has not been changed."}
            </p>
            <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={onRetry} data-testid="button-retry-versions">
              {isFetching ? "Retrying…" : "Retry treatment"}
            </Button>
          </div>
        )}

        {!isPending && revisions?.length === 0 && (
          <div role="status" className="space-y-1 text-sm" data-testid="status-versions-empty">
            <p>No validated treatment yet.</p>
            <p className="text-muted-foreground">Your brief is saved, but there are no approved treatments to display.</p>
          </div>
        )}

        {latestRevision && revisions && (
          <>
            {hasMultipleTreatments && (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="treatment-version" className="text-xs text-muted-foreground">
                    View a saved treatment · newest first
                  </label>
                  <select
                    id="treatment-version"
                    data-testid="select-treatment-version"
                    aria-describedby="treatment-version-help"
                    className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedRevision?.id ?? selectedRevisionId ?? ""}
                    onChange={(event) => onSelectRevision(event.target.value)}
                  >
                    {!selectedRevision && <option value={selectedRevisionId ?? ""} disabled>Selected treatment unavailable</option>}
                    {revisions.map((revision, index) => (
                      <option key={revision.id} value={revision.id}>
                        {index === 0 ? "Latest saved treatment" : "Earlier saved treatment"} · {new Date(revision.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </option>
                    ))}
                  </select>
                </div>
                <p id="treatment-version-help" className="text-xs text-muted-foreground">
                  Viewing only. Switching records never changes your saved project.
                </p>
              </>
            )}
            {(isOlderVersion || !selectedRevision) && (
              <Button type="button" variant="outline" size="sm" onClick={() => onSelectRevision(null)} data-testid="button-latest-version">
                Back to latest
              </Button>
            )}
            {!isError && isFetching && (
              <p role="status" className="text-xs text-muted-foreground" data-testid="status-versions-refreshing">Refreshing saved treatment…</p>
            )}
          </>
        )}
      </section>

      {latestRevision && !selectedRevision && (
        <p role="status" className="mt-6 text-sm text-muted-foreground" data-testid="status-version-unavailable">
          This saved treatment is no longer available. Choose another saved treatment to continue.
        </p>
      )}

      {selectedRevision && revisions && (
        <>
          <p role="status" className="mt-6 text-xs font-mono text-muted-foreground" data-testid="status-selected-version">
            {isOlderVersion ? "Viewing an earlier saved treatment" : "Viewing the latest saved treatment"}
          </p>
          <TreatmentResult key={selectedRevision.id} data={selectedRevision.treatment} />
        </>
      )}
    </div>
  );
}