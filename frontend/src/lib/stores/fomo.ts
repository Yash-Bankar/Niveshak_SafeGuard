import { create } from "zustand";

/** What the client is allowed to know about the visitor's FOMO profile. */
export interface FomoProfileSummary {
  fomo_score: number;
  band: string;
}

/**
 * Accepts both the GET shape (`fomoScore`, Drizzle's aliased column) and the
 * POST shape (`fomo_score`), returning null when no usable profile is present.
 * Without this, a GET/POST spelling mismatch silently blanks the nav meter.
 */
export function parseFomoProfileSummary(
  raw: unknown
): FomoProfileSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const score =
    typeof record.fomo_score === "number"
      ? record.fomo_score
      : typeof record.fomoScore === "number"
        ? record.fomoScore
        : null;
  const band = typeof record.band === "string" ? record.band : null;
  if (score === null || !Number.isFinite(score) || band === null) return null;
  return { fomo_score: score, band };
}

interface FomoState {
  profile: FomoProfileSummary | null;
  loaded: boolean;
  setProfile: (profile: FomoProfileSummary) => void;
  /** Fetch /api/fomo once (idempotent); safe to call from many components. */
  load: () => void;
  /** Force a refetch after a server-side recompute (chat/watchlist/quiz). */
  refresh: () => void;
}

export const useFomoStore = create<FomoState>((set, get) => ({
  profile: null,
  loaded: false,
  setProfile: (profile) => set({ profile, loaded: true }),
  load: () => {
    if (get().loaded) return;
    fetch("/api/fomo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile?: unknown } | null) => {
        if (get().loaded) return;
        set({ profile: parseFomoProfileSummary(data?.profile), loaded: true });
      })
      .catch(() => {
        if (get().loaded) return;
        set({ loaded: true });
      });
  },
  refresh: () => {
    set({ loaded: false });
    get().load();
  },
}));
