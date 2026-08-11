import { useQuery } from "@tanstack/react-query";

import {
  listOrganizationManagedAgents,
  type BuzzOrganizationAgentFact,
} from "@/features/organization/organizationFacts";

export const organizationManagedAgentsQueryKey = [
  "organization-managed-agents",
] as const;

export type OrganizationFactsState = "connecting" | "live" | "degraded";

export function getOrganizationFactsState({
  agents,
  isError,
  isPending,
  rejectedCount,
}: {
  agents: BuzzOrganizationAgentFact[];
  isError: boolean;
  isPending: boolean;
  rejectedCount: number;
}): OrganizationFactsState {
  if (isPending) return "connecting";
  if (
    isError ||
    rejectedCount > 0 ||
    agents.some(
      (agent) =>
        agent.needsRestart ||
        agent.personaOrphaned ||
        agent.personaOutOfDate ||
        agent.lastErrorCode !== undefined,
    )
  ) {
    return "degraded";
  }
  return "live";
}

export function useOrganizationFactsQuery() {
  const query = useQuery({
    queryKey: organizationManagedAgentsQueryKey,
    queryFn: listOrganizationManagedAgents,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
  const agents = query.data?.agents ?? [];
  const rejectedCount = query.data?.rejectedCount ?? 0;

  return {
    ...query,
    agents,
    rejectedCount,
    state: getOrganizationFactsState({
      agents,
      isError: query.isError,
      isPending: query.isPending,
      rejectedCount,
    }),
  };
}
