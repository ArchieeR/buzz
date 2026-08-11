import type { OrganizationDepartmentId } from "@/features/organization/organizationModel";
import { OrganizationView } from "@/features/organization/ui/OrganizationView";

export function OrganizationScreen({
  selectedDepartmentId,
  onSelectDepartment,
}: {
  selectedDepartmentId?: OrganizationDepartmentId;
  onSelectDepartment: (id?: OrganizationDepartmentId) => void;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <OrganizationView
        onSelectDepartment={onSelectDepartment}
        selectedDepartmentId={selectedDepartmentId}
      />
    </div>
  );
}
