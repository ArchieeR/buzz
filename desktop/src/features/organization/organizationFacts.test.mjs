import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOrganizationFacts,
  normalizeOrganizationManagedAgentFact,
  normalizeOrganizationManagedAgentFacts,
} from "./organizationFacts.ts";
import {
  getOrganizationFactWarnings,
  getOrganizationSourceState,
} from "./useOrganizationFactsQuery.ts";

const pubkey = "a".repeat(64);

test("normalizes the explicit Organization managed-agent projection", () => {
  const fact = normalizeOrganizationManagedAgentFact({
    id: `buzz-agent:${pubkey}`,
    pubkey,
    display_name: "Reviewer",
    persona_id: "reviewer",
    team_id: "engineering",
    runtime: "claude",
    status: "running",
    backend: "local",
    provider: "anthropic",
    model: "claude-opus",
    parallelism: 1,
    start_on_app_launch: false,
    needs_restart: false,
    persona_out_of_date: false,
    persona_orphaned: false,
    last_error_code: null,
    sender_policy: "owner-only",
    updated_at: "2026-08-11T00:00:00Z",
    system_prompt: "must not survive",
    env_vars: { SECRET: "must not survive" },
    log_path: "/private/log",
  });

  assert.deepEqual(Object.keys(fact).sort(), [
    "backend",
    "displayName",
    "id",
    "lastErrorCode",
    "model",
    "needsRestart",
    "parallelism",
    "personaId",
    "personaOrphaned",
    "personaOutOfDate",
    "provider",
    "pubkey",
    "runtime",
    "senderPolicy",
    "startOnAppLaunch",
    "status",
    "teamId",
    "updatedAt",
  ]);
  assert.equal(fact.id, `buzz-agent:${pubkey}`);
  assert.equal(fact.displayName, "Reviewer");
  assert.equal("systemPrompt" in fact, false);
  assert.equal("envVars" in fact, false);
  assert.equal("logPath" in fact, false);
});

test("rejects facts without a canonical public-key identity", () => {
  assert.throws(
    () =>
      normalizeOrganizationManagedAgentFact({
        id: "buzz-agent:bad",
        pubkey: "bad",
      }),
    /valid 64-character public key/,
  );
});

test("keeps the backend rejected-record count visible", () => {
  const result = normalizeOrganizationManagedAgentFacts({
    agents: [],
    rejected_count: 2,
  });
  assert.deepEqual(result, { agents: [], rejectedCount: 2 });
  assert.deepEqual(
    getOrganizationFactWarnings({
      agents: [],
      rejectedCount: result.rejectedCount,
    }),
    ["2 identities excluded"],
  );
});

test("marks drifted managed-agent facts as degraded", () => {
  const agent = normalizeOrganizationManagedAgentFact({
    id: `buzz-agent:${pubkey}`,
    pubkey,
    display_name: "Reviewer",
    persona_id: null,
    team_id: null,
    runtime: "claude",
    status: "stopped",
    backend: "local",
    provider: null,
    model: null,
    parallelism: 1,
    start_on_app_launch: false,
    needs_restart: true,
    persona_out_of_date: false,
    persona_orphaned: false,
    last_error_code: null,
    sender_policy: "owner-only",
    updated_at: "2026-08-11T00:00:00Z",
  });

  assert.deepEqual(
    getOrganizationFactWarnings({ agents: [agent], rejectedCount: 0 }),
    ["1 agent needs attention"],
  );
});

test("normalizes one safe native organization snapshot with agents, teams, and channels", () => {
  const snapshot = normalizeOrganizationFacts({
    schema_version: 1,
    source_revision: "safe-revision",
    observed_at: "2026-08-19T18:00:00Z",
    agents: {
      agents: [
        {
          id: `buzz-agent:${pubkey}`,
          pubkey,
          display_name: "Reviewer",
          persona_id: "reviewer",
          team_id: "engineering",
          runtime: "claude",
          status: "running",
          backend: "provider",
          provider: "anthropic",
          model: "claude-opus",
          parallelism: 1,
          start_on_app_launch: false,
          needs_restart: false,
          persona_out_of_date: false,
          persona_orphaned: false,
          last_error_code: null,
          sender_policy: "owner-only",
          updated_at: "2026-08-19T18:00:00Z",
        },
      ],
      rejected_count: 0,
    },
    teams: [
      {
        id: "engineering",
        name: "Engineering",
        description: "Product engineering",
        persona_ids: ["reviewer"],
        is_builtin: false,
        updated_at: "2026-08-19T18:00:00Z",
        instructions: "must not survive",
        source_dir: "/private/team",
      },
    ],
    channels: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "engineering",
        channel_type: "stream",
        visibility: "private",
        description: "Engineering coordination",
        topic: "Ship safely",
        purpose: "Coordinate reviewed work",
        member_count: 1,
        member_pubkeys: [pubkey],
        last_message_at: "2026-08-19T17:59:00Z",
        archived_at: null,
        participants: ["must not survive"],
      },
    ],
  });

  assert.equal(snapshot.sourceRevision, "safe-revision");
  assert.equal(snapshot.teams[0]?.id, "buzz-team:engineering");
  assert.equal(
    snapshot.channels[0]?.id,
    "buzz-channel:11111111-1111-4111-8111-111111111111",
  );
  assert.equal(snapshot.channels[0]?.topic, "Ship safely");
  assert.equal("instructions" in snapshot.teams[0], false);
  assert.equal("sourceDir" in snapshot.teams[0], false);
  assert.equal("participants" in snapshot.channels[0], false);
});

test("accepts UUID-shaped channel ids whose version nibble is zero", () => {
  const snapshot = normalizeOrganizationFacts({
    schema_version: 1,
    source_revision: "safe-revision",
    observed_at: "2026-08-19T18:00:00Z",
    agents: { agents: [], rejected_count: 0 },
    teams: [],
    channels: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "general",
        channel_type: "stream",
        visibility: "open",
        description: "General",
        topic: null,
        purpose: null,
        member_count: 0,
        member_pubkeys: [],
        last_message_at: null,
        archived_at: null,
      },
    ],
  });
  assert.equal(
    snapshot.channels[0]?.id,
    "buzz-channel:00000000-0000-0000-0000-000000000001",
  );
});

test("keeps adapter availability separate from record warnings", () => {
  assert.equal(
    getOrganizationSourceState({ isError: false, isPending: true }),
    "connecting",
  );
  assert.equal(
    getOrganizationSourceState({ isError: false, isPending: false }),
    "live",
  );
  assert.equal(
    getOrganizationSourceState({ isError: true, isPending: false }),
    "disconnected",
  );
});
