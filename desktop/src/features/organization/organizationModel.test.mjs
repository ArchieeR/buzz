import assert from "node:assert/strict";
import test from "node:test";

import {
  getDepartmentSeats,
  isOrganizationDepartmentId,
  organizationFixture,
} from "./organizationModel.ts";

test("isOrganizationDepartmentId accepts known ids and rejects invalid search values", () => {
  assert.equal(isOrganizationDepartmentId("engineering"), true);
  assert.equal(isOrganizationDepartmentId("creative"), false);
  assert.equal(isOrganizationDepartmentId(undefined), false);
});

test("organization fixture keeps department ids unique and room capacity bounded", () => {
  const ids = organizationFixture.departments.map(
    (department) => department.id,
  );

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(
    organizationFixture.departments.every(
      (department) => department.capacity >= 1 && department.capacity <= 5,
    ),
  );
});

test("organization fixture uses the accepted active taxonomy", () => {
  assert.deepEqual(
    organizationFixture.departments.map((department) => department.id),
    [
      "leadership",
      "marketing",
      "operations",
      "engineering",
      "knowledge",
      "data-centre",
    ],
  );
});

test("getDepartmentSeats creates one manager seat and fills to capacity", () => {
  const engineering = organizationFixture.departments.find(
    (department) => department.id === "engineering",
  );
  assert.ok(engineering);

  const seats = getDepartmentSeats(engineering);

  assert.equal(seats.length, engineering.capacity);
  assert.equal(seats[0]?.kind, "manager");
  assert.equal(seats[0]?.role, "Code Lead");
  assert.equal(seats.at(-1)?.role, "QA / Reviewer");
});

test("getDepartmentSeats supplies open labels when roles do not fill capacity", () => {
  const engineering = organizationFixture.departments.find(
    (department) => department.id === "engineering",
  );
  assert.ok(engineering);

  const seats = getDepartmentSeats({
    ...engineering,
    roles: ["Code Lead"],
  });

  assert.equal(seats.length, engineering.capacity);
  assert.equal(seats[1]?.role, "Open seat 2");
  assert.equal(seats.at(-1)?.role, "Open seat 5");
});

test("external counsel is advisory and outside reporting lines", () => {
  assert.equal(organizationFixture.council.advisoryOnly, true);
  assert.equal(organizationFixture.council.reportsTo, null);
});
