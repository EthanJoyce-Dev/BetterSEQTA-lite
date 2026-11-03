import { describe, expect, it } from "@jest/globals";
import {
  activeSubjectsFromLearnPayload,
  filterAssessmentsForActiveSubjects,
  subjectsWithUpcomingAssessments,
} from "./activeSubjects";

const folders = [
  { code: "2025", subjects: [{ code: "OLD", programme: 1, metaclass: 1 }] },
  { code: "2026", active: 1, subjects: [{ code: "MATH", programme: 2, metaclass: 20 }] },
  {
    code: "2026 electives",
    active: 1,
    subjects: [
      { code: "ART", programme: 3, metaclass: 30 },
      { code: "MATH", programme: 2, metaclass: 20 },
    ],
  },
];

describe("activeSubjects", () => {
  it("reads subjects from every active folder, once each", () => {
    expect(activeSubjectsFromLearnPayload(folders).map((s) => s.code)).toEqual(["MATH", "ART"]);
    expect(activeSubjectsFromLearnPayload(null)).toEqual([]);
  });

  it("matches assessments by programme and metaclass, then by code", () => {
    const active = activeSubjectsFromLearnPayload(folders);
    const assessments = [
      { id: 1, code: "MATH", programmeID: 2, metaclassID: 20 },
      { id: 2, code: "ART" },
      { id: 3, code: "OLD", programmeID: 1, metaclassID: 1 },
      { id: 4, code: "MATH", programmeID: 9, metaclassID: 99 },
    ];

    expect(filterAssessmentsForActiveSubjects(assessments, active).map((a) => a.id)).toEqual([1, 2]);
    expect(subjectsWithUpcomingAssessments(assessments, active).map((s) => s.code)).toEqual([
      "MATH",
      "ART",
    ]);
  });
});
