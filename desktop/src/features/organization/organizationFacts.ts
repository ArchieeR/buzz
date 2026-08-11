import { invokeTauri } from "@/shared/api/tauri";

export type BuzzOrganizationAgentFact = {
  id: `buzz-agent:${string}`;
  pubkey: string;
  displayName: string;
  personaId?: string;
  teamId?: string;
  runtime?: string;
  status: string;
  backend: "local" | "provider" | "unknown";
  provider?: string;
  model?: string;
  parallelism: number;
  startOnAppLaunch: boolean;
  needsRestart: boolean;
  personaOutOfDate: boolean;
  personaOrphaned: boolean;
  lastErrorCode?: number;
  senderPolicy: "owner-only" | "allowlist" | "anyone";
  updatedAt: string;
};

export type BuzzOrganizationManagedAgentFacts = {
  agents: BuzzOrganizationAgentFact[];
  rejectedCount: number;
};

type RawOrganizationManagedAgentFact = {
  id?: unknown;
  pubkey?: unknown;
  display_name?: unknown;
  persona_id?: unknown;
  team_id?: unknown;
  runtime?: unknown;
  status?: unknown;
  backend?: unknown;
  provider?: unknown;
  model?: unknown;
  parallelism?: unknown;
  start_on_app_launch?: unknown;
  needs_restart?: unknown;
  persona_out_of_date?: unknown;
  persona_orphaned?: unknown;
  last_error_code?: unknown;
  sender_policy?: unknown;
  updated_at?: unknown;
};

function asRecord(value: unknown): RawOrganizationManagedAgentFact {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Organization managed-agent fact must be an object.");
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Organization managed-agent fact requires ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(
      `Organization managed-agent fact requires boolean ${field}.`,
    );
  }
  return value;
}

export function normalizeOrganizationManagedAgentFact(
  value: unknown,
): BuzzOrganizationAgentFact {
  const raw = asRecord(value);
  const pubkey = requiredString(raw.pubkey, "pubkey").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pubkey)) {
    throw new Error(
      "Organization managed-agent fact requires a valid 64-character public key.",
    );
  }

  const expectedId = `buzz-agent:${pubkey}` as const;
  const id = requiredString(raw.id, "id");
  if (id !== expectedId) {
    throw new Error(
      "Organization managed-agent fact ID does not match its public key.",
    );
  }

  const parallelism = raw.parallelism;
  if (
    typeof parallelism !== "number" ||
    !Number.isInteger(parallelism) ||
    parallelism < 1
  ) {
    throw new Error(
      "Organization managed-agent fact requires positive parallelism.",
    );
  }

  const backend =
    raw.backend === "local" || raw.backend === "provider"
      ? raw.backend
      : "unknown";
  const senderPolicy =
    raw.sender_policy === "allowlist" || raw.sender_policy === "anyone"
      ? raw.sender_policy
      : "owner-only";

  return {
    id: expectedId,
    pubkey,
    displayName: requiredString(raw.display_name, "display_name"),
    personaId: optionalString(raw.persona_id),
    teamId: optionalString(raw.team_id),
    runtime: optionalString(raw.runtime),
    status: requiredString(raw.status, "status"),
    backend,
    provider: optionalString(raw.provider),
    model: optionalString(raw.model),
    parallelism,
    startOnAppLaunch: requiredBoolean(
      raw.start_on_app_launch,
      "start_on_app_launch",
    ),
    needsRestart: requiredBoolean(raw.needs_restart, "needs_restart"),
    personaOutOfDate: requiredBoolean(
      raw.persona_out_of_date,
      "persona_out_of_date",
    ),
    personaOrphaned: requiredBoolean(raw.persona_orphaned, "persona_orphaned"),
    lastErrorCode:
      typeof raw.last_error_code === "number" ? raw.last_error_code : undefined,
    senderPolicy,
    updatedAt: requiredString(raw.updated_at, "updated_at"),
  };
}

export function normalizeOrganizationManagedAgentFacts(
  value: unknown,
): BuzzOrganizationManagedAgentFacts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Organization managed-agent facts must be an object.");
  }
  const raw = value as { agents?: unknown; rejected_count?: unknown };
  if (!Array.isArray(raw.agents)) {
    throw new Error(
      "Organization managed-agent facts require an agents array.",
    );
  }
  return {
    agents: raw.agents.map(normalizeOrganizationManagedAgentFact),
    rejectedCount:
      typeof raw.rejected_count === "number" &&
      Number.isInteger(raw.rejected_count) &&
      raw.rejected_count >= 0
        ? raw.rejected_count
        : 0,
  };
}

export async function listOrganizationManagedAgents(): Promise<BuzzOrganizationManagedAgentFacts> {
  const response = await invokeTauri<unknown>(
    "list_organization_managed_agents",
  );
  return normalizeOrganizationManagedAgentFacts(response);
}
