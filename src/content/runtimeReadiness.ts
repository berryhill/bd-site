import { BlogStoreUnavailableError } from "@/content/blogStore";
import {
  getBlogStore,
  getBlogStoreDiagnostics,
} from "@/content/blogStoreFactory";

const generationFromIdentity = (identity?: string) => {
  const match = identity?.match(/^object-catalog:(\d+)$/);
  return match ? Number(match[1]) : null;
};

const diagnosticBoolean = (value: string | undefined) => value === "true";

const admittedWriteFrozen = (value: string | undefined) => {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  return null;
};

const diagnosticInteger = (value: string | undefined) => {
  const candidate = value ?? "0";
  if (!/^(0|[1-9]\d{0,9})$/.test(candidate)) return 0;
  return Number(candidate);
};

const MIGRATION_STATES = new Set([
  "steady",
  "mirroring",
  "cutover",
  "rollback",
  "restoring",
]);

const diagnosticMigrationState = (value: string | undefined) => {
  const candidate = value ?? "steady";
  return MIGRATION_STATES.has(candidate) ? candidate : null;
};

const diagnosticWriterEpoch = (value: string | undefined) => {
  const candidate = value ?? "1";
  if (!/^(0|[1-9]\d{0,15})$/.test(candidate)) return null;
  return Number.isSafeInteger(Number(candidate)) ? candidate : null;
};

const diagnosticRestoreTimestamp = (value: string | undefined) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const normalizedInput = value.includes(".")
    ? value
    : value.replace(/Z$/, ".000Z");
  return parsed.toISOString() === normalizedInput ? parsed.toISOString() : null;
};

const admittedRuntimeIdentity = () => {
  const migrationState = diagnosticMigrationState(
    process.env.CONTENT_MIGRATION_STATE
  );
  const requiredMigrationState = diagnosticMigrationState(
    process.env.CONTENT_MIGRATION_REQUIRED_STATE
  );
  if (!migrationState || !requiredMigrationState) {
    throw new BlogStoreUnavailableError(
      "Content migration state is not admitted"
    );
  }

  const writerEpoch = diagnosticWriterEpoch(process.env.CONTENT_WRITER_EPOCH);
  const requiredWriterEpoch = diagnosticWriterEpoch(
    process.env.CONTENT_WRITER_REQUIRED_EPOCH
  );
  if (!writerEpoch || !requiredWriterEpoch) {
    throw new BlogStoreUnavailableError("Content writer epoch is not admitted");
  }

  return {
    migrationState,
    requiredMigrationState,
    writerEpoch,
    requiredWriterEpoch,
  };
};

let casConflicts = 0;

export function recordContentCasConflict() {
  casConflicts += 1;
}

export function assertContentWriteAdmitted() {
  const writeFrozen = admittedWriteFrozen(process.env.CONTENT_WRITE_FROZEN);
  if (writeFrozen === null) {
    throw new BlogStoreUnavailableError(
      "Content write-freeze state is not admitted"
    );
  }
  if (writeFrozen) {
    throw new BlogStoreUnavailableError("Content writes are frozen");
  }
  const {
    migrationState,
    requiredMigrationState,
    writerEpoch,
    requiredWriterEpoch,
  } = admittedRuntimeIdentity();
  if (migrationState !== requiredMigrationState) {
    throw new BlogStoreUnavailableError(
      "Content migration state is not admitted"
    );
  }
  if (writerEpoch !== requiredWriterEpoch) {
    throw new BlogStoreUnavailableError("Content writer epoch is not admitted");
  }
}

export async function getContentReadiness() {
  const {
    migrationState,
    requiredMigrationState,
    writerEpoch,
    requiredWriterEpoch,
  } = admittedRuntimeIdentity();
  const expectedGenerationValue =
    process.env.CONTENT_CATALOG_EXPECTED_GENERATION?.trim();

  if (migrationState !== requiredMigrationState) {
    throw new BlogStoreUnavailableError(
      "Content migration state is not admitted"
    );
  }
  if (writerEpoch !== requiredWriterEpoch) {
    throw new BlogStoreUnavailableError("Content writer epoch is not admitted");
  }

  const store = getBlogStore();
  await store.ready();
  const snapshot = await store.snapshot();
  const catalogGeneration = generationFromIdentity(snapshot.identity);
  if (expectedGenerationValue) {
    const expectedGeneration = Number(expectedGenerationValue);
    if (
      !Number.isSafeInteger(expectedGeneration) ||
      expectedGeneration < 0 ||
      catalogGeneration !== expectedGeneration
    ) {
      throw new BlogStoreUnavailableError(
        "Content catalog generation is not admitted"
      );
    }
  }

  return {
    ...getBlogStoreDiagnostics(),
    catalogGeneration,
    migrationState,
    writerEpoch,
    casConflicts,
    writeFrozen: diagnosticBoolean(process.env.CONTENT_WRITE_FROZEN),
    mirrorLag: diagnosticInteger(process.env.CONTENT_MIRROR_LAG),
    parityMismatch: diagnosticBoolean(process.env.CONTENT_PARITY_MISMATCH),
    restoreTimestamp: diagnosticRestoreTimestamp(
      process.env.CONTENT_RESTORE_TIMESTAMP
    ),
  };
}
