"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveJourney } from "@/providers/ActiveJourneyProvider";

/**
 * Track route redirector:
 * - Redirects to /active-journey if an active journey exists.
 * - Redirects to / (Home) if no journey is active.
 * - Eliminates standalone empty track pages from the UI.
 */
export default function TrackRedirectPage() {
  const router = useRouter();
  const { activeJourney, isInitialized } = useActiveJourney();

  useEffect(() => {
    if (!isInitialized) return;

    if (activeJourney && (activeJourney.status === "active" || activeJourney.status === "paused")) {
      router.replace("/active-journey");
    } else {
      router.replace("/");
    }
  }, [activeJourney, isInitialized, router]);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900 gap-3">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-xs font-semibold text-muted-fg">Redirecting...</span>
    </div>
  );
}
