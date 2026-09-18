/**
 * Azure Table Storage repository for delegate registrations.
 *
 * Storage choice: Azure Table Storage
 *   - Structured key/value storage with a serverless pricing model; one small
 *     storage account covers the full conference dataset.
 *   - Access protected by role-based access control; production uses the App
 *     Service system-assigned managed identity (no keys in code or config).
 *   - Deterministic duplicate prevention: the RowKey is derived from the
 *     described email, so a second submission for the same email fails with a
 *     hard EntityAlreadyExists error *and* returns the existing record.
 *
 * Locally the repo honours (in order):
 *   1. AZURE_TABLE_CONNECTION_STRING  — e.g. "UseDevelopmentStorage=true" (Azurite)
 *   2. AZURE_TABLE_ACCOUNT_ENDPOINT + DefaultAzureCredential (prompts safe path)
 *   3. Derives https://<account>.table.core.windows.net + DefaultAzureCredential
 */
import {
  TableClient,
  type TableEntity,
  odata,
} from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import { createHash, randomUUID } from "node:crypto";
import {
  emptyAllocation,
  type AllocationFields,
  type AllocationStatus,
  type MunCount,
  type RegistrationInput,
  type RegistrationRecord,
} from "@/lib/validation/registration";

const DEFAULT_TABLE = "registrations";
const DEFAULT_PARTITION = "reg";

export type CreateResult = {
  record: RegistrationRecord;
  /** true when this exact email had already registered (duplicate).  */
  duplicate: boolean;
};

/** Small abstraction so route handlers and tests share one surface. */
export interface RegistrationStore {
  ensure(): Promise<void>;
  create(input: RegistrationInput): Promise<CreateResult>;
  findById(id: string): Promise<RegistrationRecord | null>;
  findByEmail(email: string): Promise<RegistrationRecord | null>;
  list(): Promise<RegistrationRecord[]>;
  count(): Promise<number>;
  /** Merges an allocation edit into an existing record; null when not found. */
  update(id: string, patch: Partial<AllocationFields>): Promise<RegistrationRecord | null>;
}

let client: TableClient | null = null;

function tableName(): string {
  return process.env.AZURE_TABLE_NAME?.trim() || DEFAULT_TABLE;
}

export function getTableClient(): TableClient {
  if (client) return client;

  const connString = process.env.AZURE_TABLE_CONNECTION_STRING?.trim();
  if (connString) {
    client = TableClient.fromConnectionString(connString, tableName());
    return client;
  }

  const account = process.env.AZURE_STORAGE_ACCOUNT?.trim();
  if (!account) {
    throw new Error(
      "Azure Table Storage is not configured. Set AZURE_STORAGE_ACCOUNT (production) or AZURE_TABLE_CONNECTION_STRING (local), or run against Azurite."
    );
  }
  const endpoint =
    process.env.AZURE_TABLE_ACCOUNT_ENDPOINT?.trim() ??
    `https://${account}.table.core.windows.net`;
  client = new TableClient(endpoint, tableName(), new DefaultAzureCredential());
  return client;
}

function emailKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
}

function rowKeyFor(email: string): string {
  return `reg-${emailKey(email)}`;
}

function entityToRecord(entity: Record<string, unknown>): RegistrationRecord {
  const row = entity;
  return {
    id: String(row.id ?? ""),
    createdAt: String(row.createdAt ?? ""),
    status: "submitted",
    fullName: String(row.fullName ?? ""),
    email: String(row.email ?? ""),
    contactNumber: String(row.contactNumber ?? ""),
    schoolName: String(row.schoolName ?? ""),
    grade: String(row.grade ?? ""),
    munCount: (row.munCount ?? "0") as MunCount,
    munHistory: String(row.munHistory ?? ""),
    committeePref1: String(row.committeePref1 ?? ""),
    committeePref2: String(row.committeePref2 ?? ""),
    committeePref3: String(row.committeePref3 ?? ""),
    countryPreference: String(row.countryPreference ?? ""),
    specialRequest: String(row.specialRequest ?? ""),
    declarationAccurate: (row.declarationAccurate ?? "") as "Yes",
    declarationRules: (row.declarationRules ?? "") as "Yes",
    allocationStatus: (row.allocationStatus as AllocationStatus) ?? "pending",
    allocatedCommittee: String(row.allocatedCommittee ?? ""),
    allocatedPortfolio: String(row.allocatedPortfolio ?? ""),
    allocationNotes: String(row.allocationNotes ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

function entityFor(record: RegistrationRecord): TableEntity {
  return {
    partitionKey: DEFAULT_PARTITION,
    rowKey: rowKeyFor(record.email),
    ...record,
  };
}

export const registrationStore: RegistrationStore = {
  async ensure() {
    await getTableClient().createTable().catch((e: unknown) => {
      // 409 TableAlreadyExists is expected on warm starts.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/already exists|409|TableAlreadyExists/i.test(msg)) throw e;
    });
  },

  async create(input) {
    await this.ensure();
    const id = randomUUID();
    const record: RegistrationRecord = {
      ...input,
      ...emptyAllocation(),
      id,
      createdAt: new Date().toISOString(),
      status: "submitted",
    };
    try {
      await getTableClient().createEntity(entityFor(record));
      return { record, duplicate: false };
    } catch (err) {
      const isConflict =
        (err as { statusCode?: number }).statusCode === 409 ||
        /already exists|EntityAlreadyExists\b/i.test(err instanceof Error ? err.message : String(err));
      if (isConflict) {
        const existing = await this.findByEmail(record.email);
        if (existing) return { record: existing, duplicate: true };
      }
      throw err;
    }
  },

  async findById(id) {
    const rows = await this.list();
    return rows.find((r) => r.id === id) ?? null;
  },

  async findByEmail(email) {
    await this.ensure();
    try {
      const found = await getTableClient().getEntity(
        DEFAULT_PARTITION,
        rowKeyFor(email)
      );
      return entityToRecord(found);
    } catch {
      return null;
    }
  },

  async list() {
    await this.ensure();
    const entities = getTableClient().listEntities({
      queryOptions: {
        filter: odata`PartitionKey eq ${DEFAULT_PARTITION}`,
      },
    });
    const rows: RegistrationRecord[] = [];
    for await (const entity of entities) rows.push(entityToRecord(entity));
    return rows;
  },

  async count() {
    return (await this.list()).length;
  },

  async update(id, patch) {
    await this.ensure();
    const existing = await this.findById(id);
    if (!existing) return null;
    const updatedAt = new Date().toISOString();
    await getTableClient().updateEntity(
      {
        partitionKey: DEFAULT_PARTITION,
        rowKey: rowKeyFor(existing.email),
        ...patch,
        updatedAt,
      },
      "Merge"
    );
    return { ...existing, ...patch, updatedAt };
  },
};

/** Test seam: swap a fake pool while keeping the same module surface. */
export function overrideStoreForTests(store: RegistrationStore): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (registrationStore as any).__fake = store;
}

export function activeStore(): RegistrationStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake = (registrationStore as any).__fake as RegistrationStore | undefined;
  return fake ?? registrationStore;
}