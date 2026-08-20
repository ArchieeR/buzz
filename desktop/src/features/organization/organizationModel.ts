export const organizationDepartmentIds = [
  "leadership",
  "marketing",
  "operations",
  "engineering",
  "knowledge",
] as const;

export type OrganizationDepartmentId =
  (typeof organizationDepartmentIds)[number];

export function isOrganizationDepartmentId(
  value: unknown,
): value is OrganizationDepartmentId {
  return (
    typeof value === "string" &&
    organizationDepartmentIds.some((departmentId) => departmentId === value)
  );
}

export type OrganizationDepartment = {
  id: OrganizationDepartmentId;
  name: string;
  description: string;
  floor: string;
  room: string;
  kind: "leadership" | "team" | "service";
  accent: string;
  capacity: number;
  reportsToRoleId: string;
  managerRoleId: string;
  seats: OrganizationSeatDefinition[];
  capabilities: string[];
  buzzMapping: string;
};

export type OrganizationSeatDefinition = {
  id: string;
  kind: "manager" | "staff";
  role: string;
  reportsToRoleId: string;
  status: "planned" | "configured";
  memberBindingId?: string;
};

export type OrganizationSeat = {
  id: string;
  kind: "manager" | "staff";
  role: string;
  reportsToRoleId: string;
  state: "planned" | "configured" | "observed";
  memberId?: string;
  memberName?: string;
  runtimeStatus?: string;
  placement?: OrganizationMemberBinding["placement"];
};

export type OrganizationRole = {
  id: "ceo" | "head-of-agents" | "system-manager";
  title: string;
  detail: string;
  accent: string;
  status: "planned" | "configured" | "active";
  reportsToRoleId: string | null;
  memberBindingId?: string;
};

export type OrganizationMemberBinding = {
  memberId: string;
  buzzMemberId: `buzz-agent:${string}`;
  roleId: string;
  departmentId?: OrganizationDepartmentId;
  placement: "role-linked" | "department-assignment-pending";
  evidence: string;
};

export type OrganizationAgentFactInput = {
  id: `buzz-agent:${string}`;
  displayName: string;
  status: string;
};

export type ResolvedOrganizationAssignment = {
  binding: OrganizationMemberBinding;
  agent?: OrganizationAgentFactInput;
};

export type OrganizationSystemBoundary = {
  id:
    | "buzz"
    | "agent-tower"
    | "hermes"
    | "linear"
    | "rheos-brain"
    | "muse-local-rig";
  name: string;
  relationship: string;
  owns: string;
  boundary: string;
};

export type OrganizationFixture = {
  name: string;
  mode: "local";
  summary: string;
  root: OrganizationRole;
  topRoles: OrganizationRole[];
  departments: OrganizationDepartment[];
  memberBindings: OrganizationMemberBinding[];
  systems: OrganizationSystemBoundary[];
  council: {
    name: string;
    advisoryOnly: true;
    reportsTo: null;
    panels: Array<{
      id: string;
      name: string;
      availability: "default" | "optional";
    }>;
  };
};

export const organizationFixture: OrganizationFixture = {
  name: "Agent Tower",
  mode: "local",
  summary:
    "A shared operating directory for humans and agents, layered onto Buzz without turning messaging teams into the organization model.",
  root: {
    id: "ceo",
    title: "CEO",
    detail: "Accountable owner",
    accent: "#ec8daf",
    status: "active",
    reportsToRoleId: null,
  },
  topRoles: [
    {
      id: "head-of-agents",
      title: "Head of Agents",
      detail: "Agent lifecycle and standards",
      accent: "#f2a175",
      status: "planned",
      reportsToRoleId: "ceo",
    },
    {
      id: "system-manager",
      title: "System Manager",
      detail: "Runtime, connectors and governance",
      accent: "#60c4e2",
      status: "configured",
      reportsToRoleId: "ceo",
      memberBindingId: "system-manager",
    },
  ],
  departments: [
    {
      id: "leadership",
      name: "Leadership & People",
      description:
        "Management council, people operations and agent evaluation.",
      floor: "F5",
      room: "Leadership office",
      kind: "leadership",
      accent: "#dd7f9c",
      capacity: 5,
      reportsToRoleId: "ceo",
      managerRoleId: "leadership-manager",
      seats: [
        {
          id: "leadership-manager",
          kind: "manager",
          role: "Leadership Manager",
          reportsToRoleId: "ceo",
          status: "planned",
        },
        {
          id: "leadership-agent-evaluator",
          kind: "staff",
          role: "Agent Evaluator",
          reportsToRoleId: "leadership-manager",
          status: "planned",
        },
        {
          id: "leadership-people-operations",
          kind: "staff",
          role: "People Operations",
          reportsToRoleId: "leadership-manager",
          status: "planned",
        },
        {
          id: "leadership-manager-council",
          kind: "staff",
          role: "Manager Council",
          reportsToRoleId: "leadership-manager",
          status: "planned",
        },
        {
          id: "leadership-chief-of-staff",
          kind: "staff",
          role: "Chief of Staff",
          reportsToRoleId: "leadership-manager",
          status: "planned",
        },
      ],
      capabilities: ["Council", "Evaluation", "Capacity", "Policy"],
      buzzMapping: "Leadership channels",
    },
    {
      id: "marketing",
      name: "Marketing",
      description: "Campaigns, content, audience research and performance.",
      floor: "F4",
      room: "Marketing studio",
      kind: "team",
      accent: "#5ab6e8",
      capacity: 5,
      reportsToRoleId: "ceo",
      managerRoleId: "marketing-head",
      seats: [
        {
          id: "marketing-head",
          kind: "manager",
          role: "Head of Marketing",
          reportsToRoleId: "ceo",
          status: "planned",
        },
        {
          id: "marketing-campaign-strategist",
          kind: "staff",
          role: "Campaign Strategist",
          reportsToRoleId: "marketing-head",
          status: "planned",
        },
        {
          id: "marketing-content-producer",
          kind: "staff",
          role: "Content Producer",
          reportsToRoleId: "marketing-head",
          status: "planned",
        },
        {
          id: "marketing-research-analyst",
          kind: "staff",
          role: "Research Analyst",
          reportsToRoleId: "marketing-head",
          status: "planned",
        },
        {
          id: "marketing-growth-operator",
          kind: "staff",
          role: "Growth Operator",
          reportsToRoleId: "marketing-head",
          status: "planned",
        },
      ],
      capabilities: ["Rheos", "Analytics", "Publishing", "Research"],
      buzzMapping: "Marketing channels",
    },
    {
      id: "operations",
      name: "Operations & Finance",
      description:
        "Operations, programmes, financial planning, incidents and recurring execution.",
      floor: "F3",
      room: "Operations and finance control",
      kind: "team",
      accent: "#54c6b3",
      capacity: 5,
      reportsToRoleId: "ceo",
      managerRoleId: "operations-finance-head",
      seats: [
        {
          id: "operations-finance-head",
          kind: "manager",
          role: "Head of Operations & Finance",
          reportsToRoleId: "ceo",
          status: "planned",
        },
        {
          id: "operations-finance-lead",
          kind: "staff",
          role: "Finance Lead",
          reportsToRoleId: "operations-finance-head",
          status: "configured",
          memberBindingId: "cfo-head-of-finance",
        },
        {
          id: "operations-analyst",
          kind: "staff",
          role: "Operations Analyst",
          reportsToRoleId: "operations-finance-head",
          status: "planned",
        },
        {
          id: "operations-programme-coordinator",
          kind: "staff",
          role: "Programme Coordinator",
          reportsToRoleId: "operations-finance-head",
          status: "planned",
        },
        {
          id: "operations-incident-reviewer",
          kind: "staff",
          role: "Incident Reviewer",
          reportsToRoleId: "operations-finance-head",
          status: "planned",
        },
      ],
      capabilities: ["Linear", "Runbooks", "Finance", "Calendar", "Incidents"],
      buzzMapping: "Operations and finance channels",
    },
    {
      id: "engineering",
      name: "Engineering",
      description: "Product engineering, platform delivery, design and review.",
      floor: "Expansion",
      room: "Engineering workshop",
      kind: "team",
      accent: "#929fea",
      capacity: 5,
      reportsToRoleId: "ceo",
      managerRoleId: "engineering-head",
      seats: [
        {
          id: "engineering-head",
          kind: "manager",
          role: "Head of Engineering",
          reportsToRoleId: "ceo",
          status: "planned",
        },
        {
          id: "engineering-head-of-design",
          kind: "staff",
          role: "Head of Design",
          reportsToRoleId: "engineering-head",
          status: "planned",
        },
        {
          id: "engineering-product-engineer",
          kind: "staff",
          role: "Product Engineer",
          reportsToRoleId: "engineering-head",
          status: "planned",
        },
        {
          id: "engineering-platform-engineer",
          kind: "staff",
          role: "Platform Engineer",
          reportsToRoleId: "engineering-head",
          status: "planned",
        },
        {
          id: "engineering-qa-reviewer",
          kind: "staff",
          role: "QA/Reviewer",
          reportsToRoleId: "engineering-head",
          status: "planned",
        },
      ],
      capabilities: ["Git", "Claude Code", "Codex", "Firefox QA"],
      buzzMapping: "Engineering channels",
    },
    {
      id: "knowledge",
      name: "Knowledge & Data Centre",
      description:
        "Permission-scoped knowledge, local runtimes, infrastructure and observability.",
      floor: "F1–F2",
      room: "Library, vault and data centre",
      kind: "service",
      accent: "#aebc72",
      capacity: 5,
      reportsToRoleId: "ceo",
      managerRoleId: "knowledge-data-centre-head",
      seats: [
        {
          id: "knowledge-data-centre-head",
          kind: "manager",
          role: "Head of Knowledge & Data Centre",
          reportsToRoleId: "ceo",
          status: "planned",
        },
        {
          id: "knowledge-librarian",
          kind: "staff",
          role: "Librarian",
          reportsToRoleId: "knowledge-data-centre-head",
          status: "planned",
        },
        {
          id: "knowledge-retrieval-specialist",
          kind: "staff",
          role: "Retrieval Specialist",
          reportsToRoleId: "knowledge-data-centre-head",
          status: "planned",
        },
        {
          id: "knowledge-infrastructure-operator",
          kind: "staff",
          role: "Infrastructure Operator",
          reportsToRoleId: "knowledge-data-centre-head",
          status: "planned",
        },
        {
          id: "knowledge-security-reviewer",
          kind: "staff",
          role: "Security Reviewer",
          reportsToRoleId: "knowledge-data-centre-head",
          status: "planned",
        },
      ],
      capabilities: [
        "Rheos Vault",
        "Search",
        "Citations",
        "Local Rig",
        "Observability",
        "Security",
      ],
      buzzMapping: "Knowledge and infrastructure channels",
    },
  ],
  memberBindings: [
    {
      memberId: "system-manager",
      buzzMemberId:
        "buzz-agent:2d9424195e68d77a8cd1183c543f86fde64df1ac783296d6d309e31ab8b255e6",
      roleId: "system-manager",
      placement: "role-linked",
      evidence: "Agent-Tower/Code/agent-tower/data/member-links.json",
    },
    {
      memberId: "cfo-head-of-finance",
      buzzMemberId:
        "buzz-agent:dfc0163ab1c9fcda33ab0afd83386b2b173758b10d989dfba6ae3843e2f985d1",
      roleId: "operations-finance-lead",
      departmentId: "operations",
      placement: "department-assignment-pending",
      evidence: "Agent-Tower/Code/agent-tower/data/member-links.json",
    },
  ],
  systems: [
    {
      id: "buzz",
      name: "Buzz",
      relationship: "Messaging and agent gateway; native desktop shell.",
      owns: "Workspace identities, channels, messages, Buzz teams and agent launch configuration.",
      boundary:
        "Not the organisation hierarchy, scheduler, permission policy or durable project database.",
    },
    {
      id: "agent-tower",
      name: "Agent Tower",
      relationship:
        "Authoritative local organisation and context control core.",
      owns: "Departments, roles, reporting lines, capability policy, context revisions and receipts.",
      boundary:
        "Joins safe Buzz facts; it does not replace the Buzz relay or execution harness.",
    },
    {
      id: "hermes",
      name: "Hermes",
      relationship: "Agent runtime, sessions, tools and execution evidence.",
      owns: "Provider/model execution, runtime sessions, approvals, skills and tool calls.",
      boundary:
        "Consumes bound Agent Tower context; it does not choose its own identity or organisation role.",
    },
    {
      id: "linear",
      name: "Linear",
      relationship: "Canonical planned-work and acceptance system.",
      owns: "Projects, issues, dependencies, status, blockers and evidence index.",
      boundary: "The native Buzz chart has no active local Linear adapter yet.",
    },
    {
      id: "rheos-brain",
      name: "Rheos Brain",
      relationship: "Durable knowledge and cited retrieval layer.",
      owns: "Session evidence, project knowledge, classifications and provenance.",
      boundary: "Agents receive scoped retrieval, never a whole-vault dump.",
    },
    {
      id: "muse-local-rig",
      name: "Muse / Local Rig",
      relationship:
        "Optional coding workspace and bounded local-worker capacity.",
      owns: "Muse presents work; Local Rig owns local model lifecycle and capacity.",
      boundary:
        "Neither is organisation authority, task system of record or messaging transport.",
    },
  ],
  council: {
    name: "External Counsel",
    advisoryOnly: true,
    reportsTo: null,
    panels: [
      { id: "codex", name: "Codex", availability: "default" },
      { id: "muse", name: "Muse", availability: "default" },
      { id: "antigravity", name: "Antigravity", availability: "default" },
      { id: "grok", name: "Grok", availability: "optional" },
    ],
  },
};

export function getDepartmentSeats(
  department: OrganizationDepartment,
  agents: OrganizationAgentFactInput[] = [],
): OrganizationSeat[] {
  const assignments = resolveOrganizationMemberAssignments(agents).assignments;
  return department.seats.map((seat) => {
    const assignment = assignments.find(
      ({ binding }) => binding.roleId === seat.id,
    );
    return {
      id: seat.id,
      kind: seat.kind,
      role: seat.role,
      reportsToRoleId: seat.reportsToRoleId,
      state: assignment?.agent
        ? "observed"
        : seat.memberBindingId
          ? "configured"
          : "planned",
      memberId: assignment?.binding.memberId,
      memberName: assignment?.agent?.displayName,
      runtimeStatus: assignment?.agent?.status,
      placement: assignment?.binding.placement,
    };
  });
}

export function resolveOrganizationMemberAssignments(
  agents: OrganizationAgentFactInput[],
): {
  assignments: ResolvedOrganizationAssignment[];
  unmappedAgents: OrganizationAgentFactInput[];
  unresolvedBindings: OrganizationMemberBinding[];
} {
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const boundIds = new Set(
    organizationFixture.memberBindings.map((binding) => binding.buzzMemberId),
  );
  const assignments = organizationFixture.memberBindings.map((binding) => ({
    binding,
    agent: agentById.get(binding.buzzMemberId),
  }));
  return {
    assignments,
    unmappedAgents: agents.filter((agent) => !boundIds.has(agent.id)),
    unresolvedBindings: assignments
      .filter((assignment) => !assignment.agent)
      .map((assignment) => assignment.binding),
  };
}

export function getOrganizationRoleTitle(roleId: string): string | undefined {
  if (organizationFixture.root.id === roleId)
    return organizationFixture.root.title;
  const topRole = organizationFixture.topRoles.find(
    (role) => role.id === roleId,
  );
  if (topRole) return topRole.title;
  return organizationFixture.departments
    .flatMap((department) => department.seats)
    .find((seat) => seat.id === roleId)?.role;
}
