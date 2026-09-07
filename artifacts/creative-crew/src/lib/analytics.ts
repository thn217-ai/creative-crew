type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): unknown;
    };
  }
}

export type AccountAnalyticsEvent =
  | {
      name: "account_entry_clicked";
      entry: "sign_in" | "sign_up";
    }
  | {
      name: "project_claim_succeeded";
      claimedProjectCount: number;
    }
  | {
      name: "project_claim_failed";
    };

export function trackEvent(event: AccountAnalyticsEvent): void {
  if (typeof window === "undefined") return;

  try {
    if (!event || typeof event !== "object") return;

    let result: unknown;

    switch (event.name) {
      case "account_entry_clicked":
        if (event.entry !== "sign_in" && event.entry !== "sign_up") return;
        result = window.umami?.track("account_entry_clicked", {
          entry: event.entry,
          location: "workspace_header",
        });
        break;
      case "project_claim_succeeded":
        if (
          !Number.isSafeInteger(event.claimedProjectCount) ||
          event.claimedProjectCount < 0
        ) {
          return;
        }
        result = window.umami?.track("project_claim_succeeded", {
          claimed_project_count: event.claimedProjectCount,
        });
        break;
      case "project_claim_failed":
        result = window.umami?.track("project_claim_failed");
        break;
      default:
        return;
    }

    if (result !== undefined && result !== null) {
      void Promise.resolve(result).catch(() => {
        // Analytics must never break the app.
      });
    }
  } catch {
    // Analytics must never break the app.
  }
}
