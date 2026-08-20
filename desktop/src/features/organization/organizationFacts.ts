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

export type BuzzOrganizationTeamFact = {
  id: `buzz-team:${string}`;
  name: string;
  description?: string;
  personaIds: string[];
  isBuiltin: boolean;
  updatedAt?: string;
};

export type BuzzOrganizationChannelFact = {
  id: `buzz-channel:${string}`;
  name: string;
  channelType: string;
  visibility: "open" | "private" | "unknown";
  description?: string;
  topic?: string;
  purpose?: string;
  memberCount: number;
  memberPubkeys: string[];
  lastMessageAt?: string;
  archivedAt?: string;
};

export type BuzzOrganizationFacts = {
  schemaVersion: 1;
  sourceRevision: string;
  observedAt: string;
  agents: BuzzOrganizationAgentFact[];
  rejectedCount: number;
  teams: BuzzOrganizationTeamFact[];
  channels: BuzzOrganizationChannelFact[];
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

function normalizeOrganizationTeamFact(
  value: unknown,
): BuzzOrganizationTeamFact {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Organization team fact must be an object.");
  }
  const raw = value as Record<string, unknown>;
  const id = requiredString(raw.id, "team id");
  const personaIds = raw.persona_ids;
  if (
    !Array.isArray(personaIds) ||
    personaIds.some((item) => typeof item !== "string")
  ) {
    throw new Error("Organization team fact requires persona_ids.");
  }
  return {
    id: `buzz-team:${id}`,
    name: requiredString(raw.name, "team name"),
    description: optionalString(raw.description),
    personaIds: personaIds.map((item) => item.trim()).filter(Boolean),
    isBuiltin: raw.is_builtin === true,
    updatedAt: optionalString(raw.updated_at),
  };
}

function normalizeOrganizationChannelFact(
  value: unknown,
): BuzzOrganizationChannelFact {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Organization channel fact must be an object.");
  }
  const raw = value as Record<string, unknown>;
  const id = requiredString(raw.id, "channel id");

  const memberPubkeys = raw.member_pubkeys;
  if (
    !Array.isArray(memberPubkeys) ||
    memberPubkeys.some((item) => typeof item !== "string")
  ) {
    throw new Error("Organization channel fact requires member_pubkeys.");
  }
  const memberCount = raw.member_count;
  if (
    typeof memberCount !== "number" ||
    !Number.isInteger(memberCount) ||
    memberCount < 0
  ) {
    throw new Error(
      "Organization channel fact requires non-negative member_count.",
    );
  }
  return {
    id: `buzz-channel:${id.toLowerCase()}`,
    name: requiredString(raw.name, "channel name"),
    channelType: requiredString(raw.channel_type, "channel_type"),
    visibility:
      raw.visibility === "open" || raw.visibility === "private"
        ? raw.visibility
        : "unknown",
    description: optionalString(raw.description),
    topic: optionalString(raw.topic),
    purpose: optionalString(raw.purpose),
    memberCount,
    memberPubkeys: memberPubkeys.map((item) => item.toLowerCase()),
    lastMessageAt: optionalString(raw.last_message_at),
    archivedAt: optionalString(raw.archived_at),
  };
}

export function normalizeOrganizationFacts(
  value: unknown,
): BuzzOrganizationFacts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Organization facts must be an object.");
  }
  const raw = value as Record<string, unknown>;
  if (
    raw.schema_version !== 1 ||
    !Array.isArray(raw.teams) ||
    !Array.isArray(raw.channels)
  ) {
    throw new Error(
      "Organization facts require schema version 1, teams, and channels.",
    );
  }
  const agents = normalizeOrganizationManagedAgentFacts(raw.agents);
  return {
    schemaVersion: 1,
    sourceRevision: requiredString(raw.source_revision, "source_revision"),
    observedAt: requiredString(raw.observed_at, "observed_at"),
    agents: agents.agents,
    rejectedCount: agents.rejectedCount,
    teams: raw.teams.map(normalizeOrganizationTeamFact),
    channels: raw.channels.map(normalizeOrganizationChannelFact),
  };
}

export async function listOrganizationManagedAgents(): Promise<BuzzOrganizationManagedAgentFacts> {
  const response = await invokeTauri<unknown>(
    "list_organization_managed_agents",
  );
  return normalizeOrganizationManagedAgentFacts(response);
}

export async function getOrganizationFacts(): Promise<BuzzOrganizationFacts> {
  const response = await invokeTauri<unknown>("get_organization_facts");
  return normalizeOrganizationFacts(response);
}

export type OrganizationExportSaveResult = {
  saved: boolean;
  destination?: string;
  sourceRevision: string;
  observedAt: string;
};

export async function exportSafeOrganizationSnapshot(): Promise<OrganizationExportSaveResult> {
  return invokeTauri<OrganizationExportSaveResult>(
    "export_safe_organization_snapshot",
  );
}
