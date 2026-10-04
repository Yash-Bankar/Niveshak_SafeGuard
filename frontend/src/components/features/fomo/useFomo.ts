import { useEffect } from "react";
import { useFomoStore } from "@/lib/stores/fomo";

/**
 * Reactive view of the visitor's FOMO profile. Loads it once on first use
 * (TopBar meter, dashboard actions); after a quiz submit the store is
 * updated optimistically so the meter fills without a refetch.
 */
export function useFomo() {
  const profile = useFomoStore((state) => state.profile);
  const loaded = useFomoStore((state) => state.loaded);
  const load = useFomoStore((state) => state.load);

  useEffect(() => {
    load();
  }, [load]);

  return {
    score: profile?.fomo_score ?? null,
    band: profile?.band ?? null,
    hasProfile: profile !== null,
    loading: !loaded,
  };
}
