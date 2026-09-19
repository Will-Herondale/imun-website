/**
 * Storage driver selection for delegate registrations.
 *
 * Two interchangeable drivers implement the same `RegistrationStore` surface:
 *   - Postgres (Neon)  — production on Netlify; used when a connection string
 *                        is present or STORAGE_DRIVER=postgres.
 *   - Azure Table      — local development via Azurite, and the original
 *                        Azure App Service deployment.
 *
 * Routes and tests should import `activeStore` from here rather than reaching
 * for a concrete driver.
 */
import {
  registrationStore,
  type CreateResult,
  type RegistrationStore,
} from "./registrationTable";
import { postgresStore } from "./postgresStore";

export type { CreateResult, RegistrationStore };

let testOverride: RegistrationStore | null = null;

export function storageDriver(): "postgres" | "azure" {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === "postgres" || explicit === "azure") return explicit;

  const url =
    process.env.NETLIFY_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  return url ? "postgres" : "azure";
}

export function activeStore(): RegistrationStore {
  if (testOverride) return testOverride;
  return storageDriver() === "postgres" ? postgresStore : registrationStore;
}

/** Test seam: swap a fake store while keeping the same module surface. */
export function overrideStoreForTests(store: RegistrationStore): void {
  testOverride = store;
}
