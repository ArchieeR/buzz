import type { OrganizationDepartmentId } from "@/features/organization/organizationModel";
import { useOrganizationFactsQuery } from "@/features/organization/useOrganizationFactsQuery";
import { OrganizationView } from "@/features/organization/ui/OrganizationView";

export function OrganizationScreen({
  selectedDepartmentId,
  onSelectDepartment,
}: {
  selectedDepartmentId?: OrganizationDepartmentId;
  onSelectDepartment: (id?: OrganizationDepartmentId) => void;
}) {
  const organizationFacts = useOrganizationFactsQuery();

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <OrganizationView
        agents={organizationFacts.agents}
        channels={organizationFacts.channels}
        hasStaleData={organizationFacts.hasStaleData}
        onRetry={() => void organizationFacts.refetch()}
        sourceState={organizationFacts.sourceState}
        warnings={organizationFacts.warnings}
        onSelectDepartment={onSelectDepartment}
        selectedDepartmentId={selectedDepartmentId}
        buzzTeams={organizationFacts.teams}
      />
    </div>
  );
}
