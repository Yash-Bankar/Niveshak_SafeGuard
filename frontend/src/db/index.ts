/**
 * Neon Postgres client (neon-http driver) — server-only.
 *
 * Never import this module from client components: `getServerEnv()` throws
 * when touched in the browser, and the DB connection string must never reach
 * the client bundle.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

const sql = neon(getServerEnv().DATABASE_URL);

export const db = drizzle({ client: sql, schema });

export type Database = typeof db;
