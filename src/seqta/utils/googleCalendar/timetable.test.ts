import { describe, expect, it } from "@jest/globals";
import { eventApiBody, lessonsToEvents, syncWindowRange, type SeqtaLesson } from "./timetable";

const ORIGIN = "https://school.seqta.com.au";

const baseLesson: SeqtaLesson = {
  date: "2026-06-27",
  from: "09:00:00",
  until: "10:00:00",
  description: "10 Mathematics",
  staff: "Mr Smith",
  room: "MA1",
  code: "10MAT",
  type: "class",
  calendarid: 12345,
};

const toEvent = (lesson: SeqtaLesson) => lessonsToEvents(ORIGIN, [lesson])[0];

// Keys must match the full extension's so an existing calendar is updated, not duplicated.
describe("event keys", () => {
  it("prefers calendarid when present", () => {
    expect(toEvent(baseLesson)?.seqtaKey).toBe(`${ORIGIN}:cal:12345`);
  });

  it("falls back to ci, then date/time/code/description", () => {
    const { calendarid: _, ...noCal } = baseLesson;
    expect(toEvent({ ...noCal, ci: 7 })?.seqtaKey).toBe(`${ORIGIN}:ci:7:2026-06-27:09:00`);
    expect(toEvent(noCal)?.seqtaKey).toBe(`${ORIGIN}:2026-06-27:09:00:10MAT:10 Mathematics`);
  });
});

describe("lessonsToEvents", () => {
  it("maps SEQTA lesson fields to a Google event", () => {
    expect(toEvent(baseLesson)).toMatchObject({
      summary: "10 Mathematics",
      location: "MA1",
      startDateTime: "2026-06-27T09:00:00",
      endDateTime: "2026-06-27T10:00:00",
    });
    expect(toEvent(baseLesson)?.description).toContain("Teacher: Mr Smith");
    expect(toEvent(baseLesson)?.description).toContain("BetterSEQTA+ Lite");
  });

  it("maps subject colour to the nearest Google colorId", () => {
    expect(toEvent({ ...baseLesson, colour: "#dc2127" })?.colorId).toBe("11");
    expect(toEvent({ ...baseLesson, colour: "rgb(81, 183, 73)" })?.colorId).toBe("10");
  });

  it("maps appointments with notes", () => {
    const event = toEvent({
      date: "2026-07-20",
      from: "09:30",
      until: "13:10",
      description: "Advisor meeting",
      type: "appointment",
      calendarid: "event:5",
      notes: "Bring forms",
    });
    expect(event).toMatchObject({
      seqtaKey: `${ORIGIN}:cal:event:5`,
      startDateTime: "2026-07-20T09:30:00",
      endDateTime: "2026-07-20T13:10:00",
    });
    expect(event?.description).toContain("Type: Appointment");
    expect(event?.description).toContain("Notes: Bring forms");
  });

  it("skips holidays, rows without times, and duplicates", () => {
    expect(lessonsToEvents(ORIGIN, [{ ...baseLesson, type: "holiday" }])).toHaveLength(0);
    expect(lessonsToEvents(ORIGIN, [{ ...baseLesson, from: "" }])).toHaveLength(0);
    expect(lessonsToEvents(ORIGIN, [baseLesson, baseLesson])).toHaveLength(1);
  });
});

describe("eventApiBody", () => {
  it("stores the SEQTA key in a private extended property", () => {
    const body = eventApiBody(toEvent(baseLesson)!);
    expect(body.extendedProperties).toEqual({
      private: { bsplusSeqtaKey: `${ORIGIN}:cal:12345` },
    });
  });
});

describe("syncWindowRange", () => {
  it("spans the requested number of weeks from the start of this week", () => {
    const { from, until } = syncWindowRange(2);
    const days = (Date.parse(`${until}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86_400_000;
    expect(Math.round(days)).toBe(13);
  });
});
