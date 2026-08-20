import { useQuery } from "@tanstack/react-query";

import {
  getOrganizationFacts,
  type BuzzOrganizationAgentFact,
} from "@/features/organization/organizationFacts";
import { useFocusedRefetchInterval } from "@/shared/lib/useDocumentVisible";

export const organizationManagedAgentsQueryKey = [
  "organization-facts",
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
  const refetchInterval = useFocusedRefetchInterval(30_000);
  const query = useQuery({
    queryKey: organizationManagedAgentsQueryKey,
    queryFn: getOrganizationFacts,
    staleTime: 30_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const agents = query.data?.agents ?? [];
  const rejectedCount = query.data?.rejectedCount ?? 0;
  const warnings = getOrganizationFactWarnings({ agents, rejectedCount });

  return {
    ...query,
    agents,
    teams: query.data?.teams ?? [],
    channels: query.data?.channels ?? [],
    sourceRevision: query.data?.sourceRevision,
    observedAt: query.data?.observedAt,
    rejectedCount,
    sourceState: getOrganizationSourceState({
      isError: query.isError,
      isPending: query.isPending,
    }),
    hasStaleData: query.isError && query.data !== undefined,
    warnings,
  };
}
