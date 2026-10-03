import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Migrations need the DIRECT (non-pooled) connection string.
config({ path: ".env.local" });
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? "",
  },
});
