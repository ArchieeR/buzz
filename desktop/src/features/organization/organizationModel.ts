export const organizationDepartmentIds = [
  "leadership",
  "marketing",
  "operations",
  "engineering",
  "knowledge",
  "data-centre",
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
  roles: string[];
  capabilities: string[];
  buzzMapping: string;
};

export type OrganizationSeat = {
  id: string;
  kind: "manager" | "staff";
  role: string;
  state: "planned" | "assigned";
};

export type OrganizationRole = {
  id: "ceo" | "head-of-agents" | "system-manager";
  title: string;
  detail: string;
  accent: string;
  status: "planned" | "active";
};

export type OrganizationFixture = {
  name: string;
  mode: "local";
  summary: string;
  root: OrganizationRole;
  topRoles: OrganizationRole[];
  departments: OrganizationDepartment[];
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
  },
  topRoles: [
    {
      id: "head-of-agents",
      title: "Head of Agents",
      detail: "Agent lifecycle and standards",
      accent: "#f2a175",
      status: "planned",
    },
    {
      id: "system-manager",
      title: "System Manager",
      detail: "Runtime, connectors and governance",
      accent: "#60c4e2",
      status: "planned",
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
      roles: [
        "Leadership Manager",
        "Agent Evaluator",
        "People Operations",
        "Manager Council",
        "Chief of Staff",
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
      roles: [
        "Marketing Manager",
        "Campaign Strategist",
        "Content Producer",
        "Research Analyst",
        "Growth Operator",
      ],
      capabilities: ["Rheos", "Analytics", "Publishing", "Research"],
      buzzMapping: "Marketing channels",
    },
    {
      id: "operations",
      name: "Operations",
      description: "Runbooks, programmes, incidents and recurring operations.",
      floor: "F3",
      room: "Operations control",
      kind: "team",
      accent: "#54c6b3",
      capacity: 5,
      roles: [
        "Operations Manager",
        "Operations Analyst",
        "Runbook Agent",
        "Programme Coordinator",
        "Incident Reviewer",
      ],
      capabilities: ["Linear", "Runbooks", "Calendar", "Incidents"],
      buzzMapping: "Operations channels",
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
      roles: [
        "Code Lead",
        "Head of Design",
        "Product Engineer",
        "Platform Engineer",
        "QA / Reviewer",
      ],
      capabilities: ["Git", "Claude Code", "Codex", "Firefox QA"],
      buzzMapping: "Engineering channels",
    },
    {
      id: "knowledge",
      name: "Library & Knowledge Vault",
      description: "Permission-scoped retrieval, curation and cited evidence.",
      floor: "F2",
      room: "Library and vault",
      kind: "service",
      accent: "#aebc72",
      capacity: 5,
      roles: [
        "Knowledge Manager",
        "Librarian",
        "Vault Custodian",
        "Retrieval Specialist",
        "Research Curator",
      ],
      capabilities: ["Rheos Vault", "Search", "Citations", "Permissions"],
      buzzMapping: "Knowledge channels",
    },
    {
      id: "data-centre",
      name: "Data Centre",
      description: "Local runtimes, infrastructure, health and observability.",
      floor: "F1",
      room: "Data centre",
      kind: "service",
      accent: "#b08ae2",
      capacity: 5,
      roles: [
        "Infrastructure Manager",
        "Platform Agent",
        "Runtime Operator",
        "Observability Agent",
        "Security Reviewer",
      ],
      capabilities: ["Local Rig", "MCP", "Telemetry", "Security"],
      buzzMapping: "System channels",
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
): OrganizationSeat[] {
  return Array.from({ length: department.capacity }, (_, index) => ({
    id: `${department.id}:${index + 1}`,
    kind: index === 0 ? ("manager" as const) : ("staff" as const),
    role: department.roles[index] ?? `Open seat ${index + 1}`,
    state: "planned" as const,
  }));
}
