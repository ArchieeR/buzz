import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  isOrganizationDepartmentId,
  type OrganizationDepartmentId,
} from "@/features/organization/organizationModel";
import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

type OrganizationRouteSearch = {
  department?: OrganizationDepartmentId;
};

function validateOrganizationSearch(
  search: Record<string, unknown>,
): OrganizationRouteSearch {
  const department = search.department;
  return {
    department: isOrganizationDepartmentId(department) ? department : undefined,
  };
}

const OrganizationScreen = React.lazy(async () => {
  const module = await import("@/features/organization/ui/OrganizationScreen");
  return { default: module.OrganizationScreen };
});

export const Route = createFileRoute("/organization")({
  validateSearch: validateOrganizationSearch,
  component: OrganizationRouteComponent,
});

function OrganizationRouteComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleSelectDepartment = React.useCallback(
    (department?: OrganizationDepartmentId) => {
      void navigate({
        replace: department === undefined,
        search: department ? { department } : {},
      });
    },
    [navigate],
  );

  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="agents" />}>
      <OrganizationScreen
        onSelectDepartment={handleSelectDepartment}
        selectedDepartmentId={search.department}
      />
    </React.Suspense>
  );
}
