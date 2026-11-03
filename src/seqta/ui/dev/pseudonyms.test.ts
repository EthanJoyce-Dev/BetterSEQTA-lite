import { describe, expect, it } from "@jest/globals";
import {
  fakeDigits,
  fakeHouse,
  fakeInitials,
  fakePeople,
  fakePersonName,
  fakeRoom,
} from "./pseudonyms";

describe("pseudonyms", () => {
  it("gives a teacher the same fake name every time and keeps the title", () => {
    const fake = fakePersonName("Mrs Colleen Wheeler");
    expect(fake).toMatch(/^Mrs [A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(fake).not.toContain("Colleen");
    expect(fakePersonName("Mrs Colleen Wheeler")).toBe(fake);
    expect(fakePersonName("Ethan Sanders")).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("fakes each person in a list", () => {
    const [a, b] = fakePeople("Mr Alan Thomas, Ms Tessa Hill").split(", ");
    expect(a).toBe(fakePersonName("Mr Alan Thomas"));
    expect(b).toBe(fakePersonName("Ms Tessa Hill"));
  });

  it("turns rooms into a letter and a number", () => {
    for (const room of ["F15", "MS20", "SP14", "Library"]) {
      expect(fakeRoom(room)).toMatch(/^[A-Z]([1-9]|[1-3]\d|40)$/);
      expect(fakeRoom(room)).toBe(fakeRoom(room));
    }
  });

  it("leaves placeholders alone", () => {
    expect(fakePersonName("Unknown")).toBe("Unknown");
    expect(fakeRoom("N/A")).toBe("N/A");
    expect(fakeRoom("")).toBe("");
  });

  it("keeps the shape of IDs and the year level of houses", () => {
    const id = fakeDigits("STU0218147 // 34420260");
    expect(id).toMatch(/^STU\d{7} \/\/ \d{8}$/);
    expect(id).not.toBe("STU0218147 // 34420260");
    expect(fakeHouse("10Loyola")).toMatch(/^10(Banksia|Jarrah|Karri|Marri|Tuart|Wattle)$/);
    expect(fakeInitials("CW")).toMatch(/^[A-Z]{2}$/);
  });
});
