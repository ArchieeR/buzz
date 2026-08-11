import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOrganizationManagedAgentFact,
  normalizeOrganizationManagedAgentFacts,
} from "./organizationFacts.ts";
import { getOrganizationFactsState } from "./useOrganizationFactsQuery.ts";

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
  assert.equal(
    getOrganizationFactsState({
      agents: [],
      isError: false,
      isPending: false,
      rejectedCount: result.rejectedCount,
    }),
    "degraded",
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

  assert.equal(
    getOrganizationFactsState({
      agents: [agent],
      isError: false,
      isPending: false,
      rejectedCount: 0,
    }),
    "degraded",
  );
});
