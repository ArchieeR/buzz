import assert from "node:assert/strict";
import test from "node:test";

import {
  getDepartmentSeats,
  getOrganizationRoleTitle,
  isOrganizationDepartmentId,
  organizationFixture,
  resolveOrganizationMemberAssignments,
} from "./organizationModel.ts";

const allRoles = [
  organizationFixture.root,
  ...organizationFixture.topRoles,
  ...organizationFixture.departments.flatMap((department) => department.seats),
];
const allRoleIds = new Set(allRoles.map((role) => role.id));

test("isOrganizationDepartmentId accepts known ids and rejects invalid search values", () => {
  assert.equal(isOrganizationDepartmentId("engineering"), true);
  assert.equal(isOrganizationDepartmentId("creative"), false);
  assert.equal(isOrganizationDepartmentId(undefined), false);
});

test("organization fixture uses the accepted consolidated active taxonomy", () => {
  assert.deepEqual(
    organizationFixture.departments.map((department) => department.id),
    ["leadership", "marketing", "operations", "engineering", "knowledge"],
  );
  assert.deepEqual(
    organizationFixture.departments.map((department) => department.name),
    [
      "Leadership & People",
      "Marketing",
      "Operations & Finance",
      "Engineering",
      "Knowledge & Data Centre",
    ],
  );
  assert.equal(
    organizationFixture.departments
      .find(({ id }) => id === "engineering")
      ?.seats.at(-1)?.role,
    "QA/Reviewer",
  );
  assert.equal(
    organizationFixture.departments.find(({ id }) => id === "operations")
      ?.seats[1]?.role,
    "Finance Lead",
  );
});

test("organization role ids, names and reporting references are complete and acyclic", () => {
  const roleIds = allRoles.map((role) => role.id);
  const roleTitles = allRoles.map((role) =>
    "title" in role ? role.title : role.role,
  );
  assert.equal(new Set(roleIds).size, roleIds.length);
  assert.equal(new Set(roleTitles).size, roleTitles.length);

  const reportsToById = new Map(
    allRoles.map((role) => [role.id, role.reportsToRoleId]),
  );
  assert.equal(reportsToById.get("ceo"), null);
  for (const [roleId, reportsToRoleId] of reportsToById) {
    if (roleId !== "ceo") {
      assert.ok(reportsToRoleId, `${roleId} must have a reporting reference`);
      assert.ok(
        reportsToById.has(reportsToRoleId),
        `${roleId} reports to missing role ${reportsToRoleId}`,
      );
    }

    const visited = new Set([roleId]);
    let cursor = reportsToRoleId;
    while (cursor !== null && cursor !== undefined) {
      assert.equal(visited.has(cursor), false, `reporting cycle at ${cursor}`);
      visited.add(cursor);
      cursor = reportsToById.get(cursor);
    }
  }
});

test("every department has one resolvable manager and bounded unique seats", () => {
  const departmentIds = organizationFixture.departments.map(
    (department) => department.id,
  );
  const departmentNames = organizationFixture.departments.map(
    (department) => department.name,
  );
  assert.equal(new Set(departmentIds).size, departmentIds.length);
  assert.equal(new Set(departmentNames).size, departmentNames.length);

  for (const department of organizationFixture.departments) {
    assert.ok(department.capacity >= 1 && department.capacity <= 5);
    assert.equal(department.seats.length, department.capacity);
    assert.equal(
      new Set(department.seats.map((seat) => seat.id)).size,
      department.seats.length,
    );
    assert.ok(allRoleIds.has(department.reportsToRoleId));
    const managers = department.seats.filter((seat) => seat.kind === "manager");
    assert.equal(managers.length, 1);
    assert.equal(managers[0]?.id, department.managerRoleId);
    assert.equal(managers[0]?.reportsToRoleId, department.reportsToRoleId);
    assert.ok(allRoleIds.has(department.managerRoleId));
    assert.ok(
      department.seats
        .filter((seat) => seat.kind === "staff")
        .every((seat) => seat.reportsToRoleId === department.managerRoleId),
    );
  }
});

test("member bindings are unique, non-orphaned and cannot map an agent twice", () => {
  const memberIds = organizationFixture.memberBindings.map(
    (binding) => binding.memberId,
  );
  const buzzMemberIds = organizationFixture.memberBindings.map(
    (binding) => binding.buzzMemberId,
  );
  const bindingRoleIds = organizationFixture.memberBindings.map(
    (binding) => binding.roleId,
  );
  assert.equal(new Set(memberIds).size, memberIds.length);
  assert.equal(new Set(buzzMemberIds).size, buzzMemberIds.length);
  assert.equal(new Set(bindingRoleIds).size, bindingRoleIds.length);

  for (const binding of organizationFixture.memberBindings) {
    assert.ok(allRoleIds.has(binding.roleId));
    assert.match(binding.buzzMemberId, /^buzz-agent:[0-9a-f]{64}$/);
    if (binding.departmentId) {
      const department = organizationFixture.departments.find(
        ({ id }) => id === binding.departmentId,
      );
      assert.ok(department);
      assert.ok(department.seats.some((seat) => seat.id === binding.roleId));
    }
  }

  const configuredRoles = allRoles.filter(
    (role) => "memberBindingId" in role && role.memberBindingId,
  );
  const configuredBindingIds = configuredRoles.map(
    (role) => role.memberBindingId,
  );
  assert.equal(new Set(configuredBindingIds).size, configuredBindingIds.length);
  for (const role of configuredRoles) {
    const binding = organizationFixture.memberBindings.find(
      ({ memberId }) => memberId === role.memberBindingId,
    );
    assert.ok(binding, `${role.id} has an orphaned member binding`);
    assert.equal(binding.roleId, role.id);
    assert.notEqual(role.status, "planned");
  }
  for (const binding of organizationFixture.memberBindings) {
    const role = configuredRoles.find(({ id }) => id === binding.roleId);
    assert.ok(role, `${binding.memberId} targets an unconfigured role`);
    assert.equal(role.memberBindingId, binding.memberId);
  }

  assert.equal(
    organizationFixture.memberBindings.find(
      ({ memberId }) => memberId === "cfo-head-of-finance",
    )?.placement,
    "department-assignment-pending",
  );
});

test("observed facts reconcile to configured roles without inventing department assignments", () => {
  const agents = organizationFixture.memberBindings.map((binding) => ({
    id: binding.buzzMemberId,
    displayName:
      binding.memberId === "system-manager"
        ? "System Manager"
        : "CFO / Head of Finance",
    status: "stopped",
  }));
  const reconciliation = resolveOrganizationMemberAssignments(agents);
  assert.equal(reconciliation.assignments.length, 2);
  assert.equal(reconciliation.unmappedAgents.length, 0);
  assert.equal(reconciliation.unresolvedBindings.length, 0);
  const observedAgentIds = reconciliation.assignments.flatMap((assignment) =>
    assignment.agent ? [assignment.agent.id] : [],
  );
  assert.equal(new Set(observedAgentIds).size, observedAgentIds.length);

  const operations = organizationFixture.departments.find(
    ({ id }) => id === "operations",
  );
  assert.ok(operations);
  const seats = getDepartmentSeats(operations, agents);
  assert.equal(seats[0]?.role, "Head of Operations & Finance");
  assert.equal(seats[0]?.state, "planned");
  assert.equal(seats[1]?.role, "Finance Lead");
  assert.equal(seats[1]?.state, "observed");
  assert.equal(seats[1]?.placement, "department-assignment-pending");
});

test("configured-but-unobserved, placement-pending and unmapped states stay explicit", () => {
  const systemManagerBinding = organizationFixture.memberBindings.find(
    ({ memberId }) => memberId === "system-manager",
  );
  assert.ok(systemManagerBinding);
  const unknownAgent = {
    id: `buzz-agent:${"f".repeat(64)}`,
    displayName: "Unmapped reviewer",
    status: "running",
  };
  const reconciliation = resolveOrganizationMemberAssignments([
    {
      id: systemManagerBinding.buzzMemberId,
      displayName: "System Manager",
      status: "running",
    },
    unknownAgent,
  ]);
  assert.deepEqual(reconciliation.unmappedAgents, [unknownAgent]);
  assert.deepEqual(
    reconciliation.unresolvedBindings.map((binding) => binding.memberId),
    ["cfo-head-of-finance"],
  );

  const operations = organizationFixture.departments.find(
    ({ id }) => id === "operations",
  );
  assert.ok(operations);
  const financeSeat = getDepartmentSeats(operations).find(
    ({ id }) => id === "operations-finance-lead",
  );
  assert.equal(financeSeat?.state, "configured");
  assert.equal(financeSeat?.placement, "department-assignment-pending");
});

test("system boundaries are unique and keep authority separated", () => {
  const systemIds = organizationFixture.systems.map((system) => system.id);
  const systemNames = organizationFixture.systems.map((system) => system.name);
  assert.equal(new Set(systemIds).size, systemIds.length);
  assert.equal(new Set(systemNames).size, systemNames.length);
  assert.deepEqual(systemIds, [
    "buzz",
    "agent-tower",
    "hermes",
    "linear",
    "rheos-brain",
    "muse-local-rig",
  ]);
  assert.ok(
    organizationFixture.systems.every(
      (system) => system.relationship && system.owns && system.boundary,
    ),
  );
  assert.match(
    organizationFixture.systems.find(({ id }) => id === "buzz")?.boundary ?? "",
    /Not the organisation hierarchy/,
  );
  assert.equal(getOrganizationRoleTitle("system-manager"), "System Manager");
  assert.equal(getOrganizationRoleTitle("missing-role"), undefined);
});

test("external counsel is advisory and outside reporting lines", () => {
  assert.equal(organizationFixture.council.advisoryOnly, true);
  assert.equal(organizationFixture.council.reportsTo, null);
});
