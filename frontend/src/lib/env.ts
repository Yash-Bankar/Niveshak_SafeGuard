import { z } from "zod";

/**
 * Server-only environment validation.
 *
 * Validation runs lazily on first access of `getServerEnv()` (not at import),
 * so `next build` never breaks just because this module is loaded.
 * When USE_MOCK_BACKEND === "true", the LLM backend variables are optional.
 */

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Neon pooled string)"),
    DIRECT_URL: z.string().min(1, "DIRECT_URL is required (Neon direct string)"),
    LLM_BACKEND_URL: z.string().optional(),
    LLM_BACKEND_API_KEY: z.string().optional(),
    USE_MOCK_BACKEND: z.enum(["true", "false"]).default("true"),
    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  })
  .superRefine((val, ctx) => {
    if (val.USE_MOCK_BACKEND === "true") return;
    if (!val.LLM_BACKEND_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_BACKEND_URL"],
        message:
          "LLM_BACKEND_URL is required when USE_MOCK_BACKEND is not \"true\"",
      });
    }
    if (!val.LLM_BACKEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_BACKEND_API_KEY"],
        message:
          "LLM_BACKEND_API_KEY is required when USE_MOCK_BACKEND is not \"true\"",
      });
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() is server-only — never call it from client components."
    );
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`
    );
    throw new Error(
      `Invalid environment configuration:\n${lines.join("\n")}\n` +
        `Copy .env.example to .env.local and fill in the values.`
    );
  }

  cached = parsed.data;
  return cached;
}
