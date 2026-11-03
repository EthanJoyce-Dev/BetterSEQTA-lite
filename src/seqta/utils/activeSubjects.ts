/**
 * Matches assessments to the student's current subjects. From BetterSEQTA+
 * (assessmentsOverview/utils.ts), which Lite doesn't ship.
 */
export interface ActiveSubject {
  code: string;
  programme: number;
  metaclass: number;
  title: string;
}

function isActiveTermFlag(active: unknown): boolean {
  return active === 1 || active === true;
}

function programmeAndMetaclass(item: Record<string, unknown>): [number, number] | null {
  const programme = Number(item.programmeID ?? item.programme);
  const metaclass = Number(item.metaclassID ?? item.metaclass);
  if (!programme || !metaclass || Number.isNaN(programme) || Number.isNaN(metaclass)) {
    return null;
  }
  return [programme, metaclass];
}

function subjectCode(item: Record<string, unknown>): string {
  return String(item.code ?? item.subject ?? "").trim();
}

export function normalizeSubject(raw: unknown): ActiveSubject | null {
  if (!raw || typeof raw !== "object") return null;

  const subject = raw as Record<string, unknown>;
  const ids = programmeAndMetaclass(subject);
  const code = subjectCode(subject);
  if (!ids || !code) return null;

  return {
    code,
    programme: ids[0],
    metaclass: ids[1],
    title: String(subject.title ?? subject.description ?? code),
  };
}

/**
 * Subjects from every active folder in `/seqta/student/load/subjects`.
 * Students can have more than one active folder, so don't stop at the first.
 */
export function activeSubjectsFromLearnPayload(payload: unknown): ActiveSubject[] {
  if (!Array.isArray(payload)) return [];

  const subjects: ActiveSubject[] = [];
  const seen = new Set<string>();

  for (const folder of payload) {
    if (!folder || typeof folder !== "object") continue;
    const term = folder as { active?: unknown; subjects?: unknown[] };
    if (!isActiveTermFlag(term.active) || !Array.isArray(term.subjects)) continue;

    for (const raw of term.subjects) {
      const subject = normalizeSubject(raw);
      if (!subject) continue;
      const key = `${subject.programme}-${subject.metaclass}`;
      if (seen.has(key)) continue;
      seen.add(key);
      subjects.push(subject);
    }
  }

  return subjects;
}

function assessmentBelongsToActiveSubjects(
  assessment: Record<string, unknown>,
  activeSubjects: ActiveSubject[],
): boolean {
  if (!activeSubjects.length) return false;

  const ids = programmeAndMetaclass(assessment);
  if (ids) {
    return activeSubjects.some((s) => s.programme === ids[0] && s.metaclass === ids[1]);
  }

  const code = subjectCode(assessment);
  return !!code && activeSubjects.some((s) => s.code === code);
}

export function activeSubjectForAssessment(
  assessment: Record<string, unknown>,
  activeSubjects: ActiveSubject[],
): ActiveSubject | undefined {
  const ids = programmeAndMetaclass(assessment);
  if (ids) {
    const subject = activeSubjects.find((s) => s.programme === ids[0] && s.metaclass === ids[1]);
    if (subject) return subject;
  }

  const code = subjectCode(assessment);
  return code ? activeSubjects.find((s) => s.code === code) : undefined;
}

export function filterAssessmentsForActiveSubjects<T extends Record<string, unknown>>(
  assessments: T[],
  activeSubjects: ActiveSubject[],
): T[] {
  return assessments.filter((a) => assessmentBelongsToActiveSubjects(a, activeSubjects));
}

/** Active subjects that have at least one assessment in the given list. */
export function subjectsWithUpcomingAssessments(
  assessments: Record<string, unknown>[],
  activeSubjects: ActiveSubject[],
): ActiveSubject[] {
  const result: ActiveSubject[] = [];
  const seen = new Set<string>();

  for (const assessment of assessments) {
    const subject = activeSubjectForAssessment(assessment, activeSubjects);
    if (!subject || seen.has(subject.code)) continue;
    seen.add(subject.code);
    result.push(subject);
  }

  return result;
}
