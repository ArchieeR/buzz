import { useQuery } from "@tanstack/react-query";

import {
  listOrganizationManagedAgents,
  type BuzzOrganizationAgentFact,
} from "@/features/organization/organizationFacts";

export const organizationManagedAgentsQueryKey = [
  "organization-managed-agents",
] as const;

export type OrganizationSourceState = "connecting" | "live" | "disconnected";

export function getOrganizationSourceState({
  isError,
  isPending,
}: {
  isError: boolean;
  isPending: boolean;
}): OrganizationSourceState {
  if (isPending) return "connecting";
  return isError ? "disconnected" : "live";
}

export function getOrganizationFactWarnings({
  agents,
  rejectedCount,
}: {
  agents: BuzzOrganizationAgentFact[];
  rejectedCount: number;
}): string[] {
  const warnings: string[] = [];
  if (rejectedCount > 0) {
    warnings.push(
      `${rejectedCount} ${rejectedCount === 1 ? "identity" : "identities"} excluded`,
    );
  }
  const attentionCount = agents.filter(
    (agent) =>
      agent.needsRestart ||
      agent.personaOrphaned ||
      agent.personaOutOfDate ||
      agent.lastErrorCode !== undefined,
  ).length;
  if (attentionCount > 0) {
    warnings.push(
      `${attentionCount} ${attentionCount === 1 ? "agent needs" : "agents need"} attention`,
    );
  }
  return warnings;
}

export function useOrganizationFactsQuery() {
  const query = useQuery({
    queryKey: organizationManagedAgentsQueryKey,
    queryFn: listOrganizationManagedAgents,
    staleTime: 5_000,
    refetchInterval: 5_000,
    retry: false,
  });
  const agents = query.data?.agents ?? [];
  const rejectedCount = query.data?.rejectedCount ?? 0;
  const warnings = getOrganizationFactWarnings({ agents, rejectedCount });

  return {
    ...query,
    agents,
    rejectedCount,
    sourceState: getOrganizationSourceState({
      isError: query.isError,
      isPending: query.isPending,
    }),
    hasStaleData: query.isError && query.data !== undefined,
    warnings,
  };
}
