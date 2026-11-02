import { toISODate, weekRangeContaining } from "@/seqta/utils/Loaders/engageParentTimetable";
import { EVENT_KEY_PROP } from "./config";

export interface SyncDateRange {
  from: string;
  until: string;
}

export interface SeqtaLesson {
  date: string;
  from: string;
  until: string;
  description: string;
  staff?: string;
  room?: string;
  code?: string;
  type?: string;
  period?: string;
  notes?: string;
  calendarid?: string | number;
  ci?: number;
  /** SEQTA subject colour (hex/rgb), mapped to the nearest Google event colour. */
  colour?: string;
}

export interface CalendarEvent {
  seqtaKey: string;
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  colorId?: string;
}

/** Rolling window of `weeks` weeks starting on the current week. */
export function syncWindowRange(weeks: number): SyncDateRange {
  const { from } = weekRangeContaining(new Date());
  const end = new Date(`${from}T12:00:00`);
  end.setDate(end.getDate() + weeks * 7 - 1);
  return { from, until: toISODate(end) };
}

export const isDateInRange = (date: string, range: SyncDateRange) =>
  date >= range.from && date <= range.until;

// ---------------------------------------------------------------------------
// SEQTA requests (run in the SEQTA tab so the session cookies apply)
// ---------------------------------------------------------------------------

async function postSeqta<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${location.origin}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SEQTA request failed (${res.status})`);
  return (await res.json()) as T;
}

function isEngageParent(): boolean {
  return (
    location.pathname.includes("/parent/") ||
    location.hash.includes("/parent/") ||
    document.body.classList.contains("parent")
  );
}

type LoginPayload = { id?: number; student?: number; type?: string };
let cachedLogin: LoginPayload | null = null;

async function loginPayload(): Promise<LoginPayload | undefined> {
  if (cachedLogin?.id != null) return cachedLogin;
  try {
    const json = await postSeqta<{ payload?: LoginPayload }>("/seqta/student/login", {
      mode: "normal",
      query: null,
      redirect_url: location.href,
    });
    cachedLogin = json?.payload ?? null;
    return cachedLogin ?? undefined;
  } catch {
    return undefined;
  }
}

async function resolveStudentId(): Promise<number | undefined> {
  if (isEngageParent()) {
    const data = await postSeqta<{ payload?: { id?: string | number }[] }>(
      "/seqta/parent/load/timetable",
      { list: true },
    );
    const id = Array.isArray(data?.payload) ? Number(data.payload[0]?.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }
  const payload = await loginPayload();
  const id = payload?.id ?? payload?.student;
  return typeof id === "number" && Number.isFinite(id) ? id : undefined;
}

type PrefItem = { name?: string; value?: string };

async function fetchSubjectColours(studentId: number | undefined): Promise<Record<string, string>> {
  try {
    const path = isEngageParent() ? "/seqta/parent/load/prefs?" : "/seqta/student/load/prefs?";
    const body: Record<string, unknown> = { request: "userPrefs", asArray: true };
    if (!isEngageParent() && studentId != null) body.user = studentId;
    const data = await postSeqta<{ payload?: PrefItem[] }>(path, body);
    const colours: Record<string, string> = {};
    const prefix = "timetable.subject.colour.";
    for (const pref of data?.payload ?? []) {
      if (pref.name?.startsWith(prefix) && pref.value) {
        colours[pref.name.slice(prefix.length)] = pref.value;
      }
    }
    return colours;
  } catch {
    return {};
  }
}

type AppointmentPayload = {
  id?: number;
  from?: string;
  until?: string;
  event?: { id?: number; title?: string; notes?: string; colour?: string; event_type?: string };
};

/** Parse SEQTA datetimes like `2026-07-20 09:30:00.0`. */
function parseSeqtaDateTime(value: string | undefined): { date: string; time: string } | null {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/);
  return match ? { date: match[1], time: match[2] } : null;
}

async function fetchAppointments(range: SyncDateRange, person: number): Promise<SeqtaLesson[]> {
  const personType = (await loginPayload())?.type?.trim().toLowerCase() || "student";
  const data = await postSeqta<{ payload?: AppointmentPayload[] }>("/seqta/student/events/load", {
    dateFrom: range.from,
    dateTo: range.until,
    person,
    personType,
  });
  const lessons: SeqtaLesson[] = [];
  for (const item of data?.payload ?? []) {
    const start = parseSeqtaDateTime(item.from);
    const end = parseSeqtaDateTime(item.until);
    const title = item.event?.title?.trim();
    const eventId = item.event?.id ?? item.id;
    if (!start || !end || !title || eventId == null) continue;
    const notes = item.event?.notes?.trim();
    lessons.push({
      date: start.date,
      from: start.time,
      until: end.time,
      description: title,
      type: item.event?.event_type?.trim() || "appointment",
      calendarid: `event:${eventId}`,
      colour: item.event?.colour?.trim() || undefined,
      ...(notes ? { notes } : {}),
    });
  }
  return lessons;
}

/** Lessons (with subject colours) plus appointments in the range. */
export async function fetchTimetable(range: SyncDateRange): Promise<SeqtaLesson[]> {
  const studentId = await resolveStudentId();
  const coloursPromise = fetchSubjectColours(studentId);

  let lessons: SeqtaLesson[];
  if (isEngageParent()) {
    if (studentId == null) throw new Error("No student found on this parent account.");
    const data = await postSeqta<{ payload?: { items?: SeqtaLesson[] } }>(
      "/seqta/parent/load/timetable",
      { from: range.from, until: range.until, student: studentId },
    );
    if (!Array.isArray(data?.payload?.items)) throw new Error("Invalid SEQTA timetable response.");
    lessons = data.payload.items;
  } else {
    const body: Record<string, unknown> = { from: range.from, until: range.until };
    if (studentId != null) body.student = studentId;
    const data = await postSeqta<{ payload?: { items?: SeqtaLesson[] } }>(
      "/seqta/student/load/timetable?",
      body,
    );
    if (!Array.isArray(data?.payload?.items)) throw new Error("Invalid SEQTA timetable response.");
    lessons = data.payload.items;
  }

  const colours = await coloursPromise;
  lessons = lessons.map((lesson) => {
    const colour = lesson.code ? colours[lesson.code.trim()] : undefined;
    return colour ? { ...lesson, colour } : lesson;
  });

  const appointments =
    !isEngageParent() && studentId != null ? await fetchAppointments(range, studentId) : [];
  return [...lessons, ...appointments];
}

// ---------------------------------------------------------------------------
// Lesson -> Google event
// ---------------------------------------------------------------------------

const SKIP_TYPES = new Set(["note", "holiday", "assembly-note"]);

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  return /^\d{1,2}:\d{2}:\d{2}$/.test(trimmed) ? trimmed.slice(0, 5) : trimmed;
}

/** Same key format as the full extension so already-synced events are matched, not duplicated. */
function lessonKey(origin: string, lesson: SeqtaLesson): string {
  if (lesson.calendarid != null && String(lesson.calendarid).length > 0) {
    return `${origin}:cal:${lesson.calendarid}`;
  }
  if (lesson.ci != null) {
    return `${origin}:ci:${lesson.ci}:${lesson.date}:${normalizeTime(lesson.from)}`;
  }
  return [origin, lesson.date, normalizeTime(lesson.from), lesson.code ?? "", lesson.description ?? ""].join(":");
}

/** Google Calendar event palette (`colorId` -> background). */
const GOOGLE_EVENT_COLOURS: ReadonlyArray<[string, number, number, number]> = [
  ["1", 0xa4, 0xbd, 0xfc], ["2", 0x7a, 0xe7, 0xbf], ["3", 0xdb, 0xad, 0xff],
  ["4", 0xff, 0x88, 0x7c], ["5", 0xfb, 0xd7, 0x5b], ["6", 0xff, 0xb8, 0x78],
  ["7", 0x46, 0xd6, 0xdb], ["8", 0xe1, 0xe1, 0xe1], ["9", 0x54, 0x84, 0xed],
  ["10", 0x51, 0xb7, 0x49], ["11", 0xdc, 0x21, 0x27],
];

function parseColour(value: string): [number, number, number] | null {
  const hex = value.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map(Math.round) as [number, number, number] : null;
}

/** Nearest Google event `colorId` to a SEQTA subject colour. */
function nearestColorId(colour: string | undefined): string | undefined {
  const target = colour ? parseColour(colour) : null;
  if (!target) return undefined;
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const [id, r, g, b] of GOOGLE_EVENT_COLOURS) {
    const distance = (target[0] - r) ** 2 + (target[1] - g) ** 2 + (target[2] - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = id;
    }
  }
  return best;
}

function lessonToEvent(origin: string, lesson: SeqtaLesson, timeZone: string): CalendarEvent | null {
  if (!lesson.date || !lesson.from || !lesson.until) return null;
  if (lesson.type && SKIP_TYPES.has(lesson.type.toLowerCase())) return null;
  const summary = (lesson.description ?? lesson.code ?? "").trim();
  if (!summary) return null;

  const notes = lesson.notes?.trim();
  const lines = ["Synced by BetterSEQTA+ Lite"];
  if ((lesson.type ?? "").toLowerCase() === "appointment") {
    lines.push("Type: Appointment");
  } else {
    if (lesson.staff?.trim()) lines.push(`Teacher: ${lesson.staff.trim()}`);
    if (lesson.code) lines.push(`Code: ${lesson.code}`);
    if (lesson.period) lines.push(`Period: ${lesson.period}`);
  }
  if (notes) lines.push(`Notes: ${notes}`);

  const colorId = nearestColorId(lesson.colour);
  return {
    seqtaKey: lessonKey(origin, lesson),
    summary,
    location: lesson.room?.trim() || undefined,
    description: lines.join("\n"),
    startDateTime: `${lesson.date}T${normalizeTime(lesson.from)}:00`,
    endDateTime: `${lesson.date}T${normalizeTime(lesson.until)}:00`,
    timeZone,
    ...(colorId ? { colorId } : {}),
  };
}

export function lessonsToEvents(origin: string, lessons: SeqtaLesson[]): CalendarEvent[] {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const seen = new Set<string>();
  const events: CalendarEvent[] = [];
  for (const lesson of lessons) {
    const event = lessonToEvent(origin, lesson, timeZone);
    if (!event || seen.has(event.seqtaKey)) continue;
    seen.add(event.seqtaKey);
    events.push(event);
  }
  return events;
}

export function eventApiBody(event: CalendarEvent): Record<string, unknown> {
  return {
    summary: event.summary,
    location: event.location,
    description: event.description,
    start: { dateTime: event.startDateTime, timeZone: event.timeZone },
    end: { dateTime: event.endDateTime, timeZone: event.timeZone },
    extendedProperties: { private: { [EVENT_KEY_PROP]: event.seqtaKey } },
    ...(event.colorId ? { colorId: event.colorId } : {}),
  };
}
