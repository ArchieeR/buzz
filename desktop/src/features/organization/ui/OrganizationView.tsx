import {
  Bot,
  Boxes,
  BriefcaseBusiness,
  CircleDot,
  Database,
  Download,
  Megaphone,
  MessageSquareMore,
  Network,
  ServerCog,
  ShieldCheck,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import type {
  BuzzOrganizationAgentFact,
  BuzzOrganizationChannelFact,
  BuzzOrganizationTeamFact,
} from "@/features/organization/organizationFacts";
import {
  getDepartmentSeats,
  resolveOrganizationMemberAssignments,
  organizationFixture,
  type ResolvedOrganizationAssignment,
  type OrganizationDepartment,
  type OrganizationDepartmentId,
  type OrganizationRole,
} from "@/features/organization/organizationModel";
import type { OrganizationSourceState } from "@/features/organization/useOrganizationFactsQuery";
import { OrganizationDepartmentDialog } from "@/features/organization/ui/OrganizationDepartmentDialog";
import { OrganizationExportDialog } from "@/features/organization/ui/OrganizationExportDialog";
import { topChromeInset } from "@/shared/layout/chromeLayout";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { PageHeader } from "@/shared/ui/PageHeader";

const departmentIcons = {
  leadership: UsersRound,
  marketing: Megaphone,
  operations: ServerCog,
  engineering: Boxes,
  knowledge: Database,
} satisfies Record<OrganizationDepartmentId, LucideIcon>;

function RoleNode({
  role,
  connected = false,
  assignment,
}: {
  role: OrganizationRole;
  connected?: boolean;
  assignment?: ResolvedOrganizationAssignment;
}) {
  const Icon =
    role.id === "system-manager"
      ? ServerCog
      : role.id === "ceo"
        ? BriefcaseBusiness
        : Bot;

  return (
    <article
      className="relative min-w-0 rounded-xl border bg-card/70 px-3.5 py-2.5 shadow-sm"
      data-testid={`organization-role-${role.id}`}
      style={{
        borderColor: `${role.accent}66`,
        background: `linear-gradient(135deg, ${role.accent}1c, transparent 72%)`,
      }}
    >
      {connected ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-3 w-px -translate-y-full bg-muted-foreground/35"
        />
      ) : null}
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
          style={{
            backgroundColor: `${role.accent}22`,
            borderColor: `${role.accent}66`,
            color: role.accent,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold leading-tight">{role.title}</p>
            <Badge className="shrink-0" variant="secondary">
              {assignment?.agent ? "observed" : role.status}
            </Badge>
          </div>
          <p
            className="line-clamp-2 text-xs leading-tight text-muted-foreground"
            title={role.detail}
          >
            {role.detail}
          </p>
          {assignment?.agent ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {assignment.agent.displayName} · {assignment.agent.status}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DepartmentNode({
  agents,
  department,
  onSelect,
}: {
  agents: BuzzOrganizationAgentFact[];
  department: OrganizationDepartment;
  onSelect: (id: OrganizationDepartmentId) => void;
}) {
  const Icon = departmentIcons[department.id];
  const seats = getDepartmentSeats(department, agents);
  const linkedSeatCount = seats.filter(
    (seat) => seat.state !== "planned",
  ).length;
  const managerSeat = seats.find(
    (seat) => seat.id === department.managerRoleId,
  );

  return (
    <button
      aria-label={`Open ${department.name}. ${linkedSeatCount} of ${department.capacity} roles linked; manager ${managerSeat?.state ?? "planned"}.`}
      className="group relative min-w-0 cursor-pointer rounded-xl border bg-card/70 px-3 pb-2 pt-4 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={`organization-department-${department.id}`}
      onClick={() => onSelect(department.id)}
      style={{
        borderColor: `${department.accent}66`,
        background: `linear-gradient(145deg, ${department.accent}18, transparent 72%)`,
      }}
      type="button"
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-3 w-px -translate-y-full bg-muted-foreground/35"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-2 bg-background shadow-sm"
        style={{ borderColor: department.accent, color: department.accent }}
      >
        <Bot className="h-3.5 w-3.5" />
      </span>

      <div className="flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: `${department.accent}20`,
            color: department.accent,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold leading-tight">
              {department.name}
            </p>
            <span className="ml-auto text-xs text-muted-foreground">
              {linkedSeatCount}/{department.capacity} linked
            </span>
          </div>
          <p
            className="truncate text-xs text-muted-foreground"
            title={managerSeat?.role}
          >
            {managerSeat?.role ?? "Manager role unresolved"} ·{" "}
            {managerSeat?.state ?? "planned"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/50 pt-2">
        <fieldset className="flex gap-1 border-0 p-0">
          <legend className="sr-only">Planned staff seats</legend>
          {seats.slice(1).map((seat) => (
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-md border bg-background/60",
                seat.state === "planned"
                  ? "border-dashed text-muted-foreground"
                  : "border-solid text-foreground",
              )}
              key={seat.id}
              title={`${seat.role}: ${seat.state}${seat.memberName ? ` (${seat.memberName})` : ""}`}
            >
              <Bot className="h-3 w-3" />
            </span>
          ))}
        </fieldset>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Wrench className="h-3.5 w-3.5" />
          {department.capabilities.length}
        </span>
      </div>
    </button>
  );
}

function Connector({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("mx-auto h-2 w-px bg-muted-foreground/35", className)}
    />
  );
}

export function OrganizationView({
  agents,
  channels,
  hasStaleData,
  observedAt,
  onRetry,
  sourceRevision,
  sourceState,
  warnings,
  buzzTeams,
  selectedDepartmentId,
  onSelectDepartment,
}: {
  agents: BuzzOrganizationAgentFact[];
  channels: BuzzOrganizationChannelFact[];
  hasStaleData: boolean;
  observedAt?: string;
  onRetry: () => void;
  sourceRevision?: string;
  sourceState: OrganizationSourceState;
  warnings: string[];
  buzzTeams: BuzzOrganizationTeamFact[];
  selectedDepartmentId?: OrganizationDepartmentId;
  onSelectDepartment: (id?: OrganizationDepartmentId) => void;
}) {
  const [exportOpen, setExportOpen] = React.useState(false);
  const leadership = organizationFixture.departments.find(
    (department) => department.kind === "leadership",
  );
  const teams = organizationFixture.departments.filter(
    (department) => department.kind === "team",
  );
  const services = organizationFixture.departments.filter(
    (department) => department.kind === "service",
  );
  const selectedDepartment =
    organizationFixture.departments.find(
      (department) => department.id === selectedDepartmentId,
    ) ?? null;
  const identityReconciliation = resolveOrganizationMemberAssignments(agents);
  const observedAssignments = identityReconciliation.assignments.filter(
    (assignment) => assignment.agent !== undefined,
  );
  const pendingPlacements = identityReconciliation.assignments.filter(
    ({ binding }) => binding.placement === "department-assignment-pending",
  );
  const assignmentForRole = (roleId: string) =>
    identityReconciliation.assignments.find(
      ({ binding }) => binding.roleId === roleId,
    );

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-xl",
        topChromeInset.divider,
      )}
    >
      <div className="buzz-content-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-5 pt-4 sm:px-6 sm:pt-5">
          <PageHeader
            action={
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {organizationFixture.departments.length} departments ·{" "}
                  {sourceState === "disconnected" && agents.length === 0
                    ? "agent facts unavailable"
                    : `${agents.length} observed`}{" "}
                  · {observedAssignments.length} observed role links
                  {pendingPlacements.length > 0
                    ? ` · ${pendingPlacements.length} placement pending`
                    : null}
                  {identityReconciliation.unmappedAgents.length > 0
                    ? ` · ${identityReconciliation.unmappedAgents.length} unmapped`
                    : null}
                  {hasStaleData ? " · last known facts" : null}
                  {warnings.length > 0 ? (
                    <span
                      aria-label={warnings.join(". ")}
                      className="text-amber-700 dark:text-amber-300"
                      role="status"
                    >
                      {` · ${warnings.length === 1 ? warnings[0] : `${warnings.length} data issues`}`}
                    </span>
                  ) : null}
                </span>
                <button
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="organization-export-open"
                  disabled={!sourceRevision || !observedAt}
                  onClick={() => setExportOpen(true)}
                  type="button"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export safe organization snapshot…
                </button>
                {sourceState === "disconnected" ? (
                  <button
                    aria-label="Buzz disconnected. Agent facts are unavailable; the planning chart remains visible. Retry now."
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border border-destructive/50 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={onRetry}
                    type="button"
                  >
                    <CircleDot className="h-3 w-3" />
                    Buzz disconnected · Retry
                  </button>
                ) : (
                  <Badge
                    aria-live="polite"
                    className="gap-1.5"
                    role="status"
                    variant="outline"
                  >
                    <CircleDot
                      className={cn(
                        "h-3 w-3",
                        sourceState === "live"
                          ? "text-emerald-500"
                          : "text-amber-500",
                      )}
                    />
                    {sourceState === "live" ? "Buzz live" : "Connecting"}
                  </Badge>
                )}
              </div>
            }
            description={organizationFixture.summary}
            title="Organization"
          />

          <section
            aria-label="Agent Tower organization chart"
            className="relative mt-3 flex flex-1 flex-col rounded-2xl border border-border/70 bg-muted/10 p-3 sm:p-4"
            data-testid="organization-view"
          >
            <p className="sr-only">
              The CEO is the accountable owner. Leadership and People, Head of
              Agents, and System Manager report to the CEO. Marketing,
              Operations and Finance, and Engineering are managed teams.
              Knowledge and Data Centre is a shared service. System Manager is
              the only configured top-tier agent role. Finance Lead has a
              configured identity but its department placement remains pending.
              External Counsel is advisory and outside reporting lines.
            </p>
            <aside
              className="mb-4 flex items-center gap-3 self-end rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 xl:absolute xl:right-4 xl:top-4 xl:mb-0 xl:w-72"
              data-testid="organization-council"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareMore className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {organizationFixture.council.name}
                  </p>
                  <Badge variant="secondary">Advisory</Badge>
                </div>
                <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                  {organizationFixture.council.panels.length} model panels ·
                  outside reporting lines
                </p>
              </div>
            </aside>

            <div className="mx-auto w-full max-w-5xl">
              <section aria-label="Executive reporting line">
                <div className="mx-auto w-full max-w-60">
                  <RoleNode role={organizationFixture.root} />
                </div>
                <Connector />

                <div className="relative grid gap-3 pt-3 md:grid-cols-3">
                  <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-0 hidden h-px bg-muted-foreground/35 md:block" />
                  {leadership ? (
                    <DepartmentNode
                      agents={agents}
                      department={leadership}
                      onSelect={onSelectDepartment}
                    />
                  ) : null}
                  {organizationFixture.topRoles.map((role) => (
                    <RoleNode
                      assignment={assignmentForRole(role.id)}
                      connected
                      key={role.id}
                      role={role}
                    />
                  ))}
                </div>
              </section>

              <section aria-labelledby="organization-teams-heading">
                <Connector className="mt-1" />
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/70" />
                  <h2
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    id="organization-teams-heading"
                  >
                    <Network className="h-3.5 w-3.5" /> Teams
                  </h2>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
                <div className="grid gap-3 pt-2 md:grid-cols-3">
                  {teams.map((department) => (
                    <DepartmentNode
                      agents={agents}
                      department={department}
                      key={department.id}
                      onSelect={onSelectDepartment}
                    />
                  ))}
                </div>
              </section>

              <section aria-labelledby="organization-services-heading">
                <Connector className="mt-1" />
                <div className="mb-2 flex min-w-0 items-center gap-3">
                  <div className="h-px flex-1 bg-border/70" />
                  <h2
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    id="organization-services-heading"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Shared services
                  </h2>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
                <div className="mx-auto grid max-w-3xl gap-3 pt-2 md:grid-cols-2">
                  {services.map((department) => (
                    <DepartmentNode
                      agents={agents}
                      department={department}
                      key={department.id}
                      onSelect={onSelectDepartment}
                    />
                  ))}
                </div>
              </section>

              {pendingPlacements.length > 0 ||
              identityReconciliation.unmappedAgents.length > 0 ||
              identityReconciliation.unresolvedBindings.length > 0 ? (
                <section
                  aria-labelledby="organization-identity-reconciliation-heading"
                  className="mt-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3"
                  data-testid="organization-identity-reconciliation"
                >
                  <h2
                    className="text-xs font-semibold text-foreground"
                    id="organization-identity-reconciliation-heading"
                  >
                    Identity reconciliation
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pendingPlacements.map(({ agent, binding }) => (
                      <Badge
                        aria-label={`${agent?.displayName ?? binding.memberId}, configured role link, department assignment pending`}
                        key={binding.memberId}
                        variant="secondary"
                      >
                        {agent?.displayName ?? binding.memberId} · placement
                        pending
                      </Badge>
                    ))}
                    {identityReconciliation.unmappedAgents.map((agent) => (
                      <Badge
                        aria-label={`${agent.displayName}, ${agent.status}, no Agent Tower role link`}
                        key={agent.id}
                        variant="secondary"
                      >
                        {agent.displayName} · unmapped
                      </Badge>
                    ))}
                    {identityReconciliation.unresolvedBindings.map(
                      (binding) => (
                        <Badge key={binding.memberId} variant="outline">
                          {binding.memberId} · configured identity not observed
                        </Badge>
                      ),
                    )}
                  </div>
                </section>
              ) : null}

              <section
                aria-labelledby="organization-system-boundaries-heading"
                className="mt-4"
                data-testid="organization-system-boundaries"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/70" />
                  <h2
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    id="organization-system-boundaries-heading"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> System boundaries
                  </h2>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {organizationFixture.systems.map((system) => (
                    <article
                      className="rounded-lg border border-border/60 bg-background/50 p-3"
                      data-testid={`organization-system-${system.id}`}
                      key={system.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">{system.name}</h3>
                        <Badge variant="outline">{system.id}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {system.relationship}
                      </p>
                      <p className="mt-2 text-xs">
                        <span className="font-medium">Owns:</span> {system.owns}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Boundary:
                        </span>{" "}
                        {system.boundary}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>

      <OrganizationExportDialog
        observedAt={observedAt}
        onOpenChange={setExportOpen}
        open={exportOpen}
        sourceRevision={sourceRevision}
      />
      <OrganizationDepartmentDialog
        agents={agents}
        channels={channels}
        department={selectedDepartment}
        onOpenChange={(open) => {
          if (!open) onSelectDepartment(undefined);
        }}
        teams={buzzTeams}
      />
    </div>
  );
}
