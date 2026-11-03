/**
 * Stand-ins for dev mode's privacy screen. The same real value always gets the
 * same fake one, so a teacher keeps one name across pages and reloads.
 */

const FIRST_NAMES = [
  "Ava", "Ben", "Chloe", "Daniel", "Ella", "Finn", "Grace", "Harry", "Isla", "Jack",
  "Kate", "Liam", "Mia", "Noah", "Olivia", "Patrick", "Ruby", "Sam", "Tess", "Will",
  "Zara", "Oscar", "Lucy", "Max", "Holly", "Leo", "Amber", "Toby", "Nina", "Hugo",
] as const;

const LAST_NAMES = [
  "Adams", "Baker", "Carter", "Dawson", "Ellis", "Foster", "Grant", "Hayes", "Irwin", "Jensen",
  "Kelly", "Lawson", "Murphy", "Nolan", "Owens", "Parker", "Quinn", "Reid", "Spencer", "Turner",
  "Vaughn", "Walsh", "Young", "Brooks", "Cole", "Doyle", "Fraser", "Hughes", "Marsh", "Price",
] as const;

const HOUSES = ["Banksia", "Jarrah", "Karri", "Marri", "Tuart", "Wattle"] as const;

const TITLE = /^(Mr|Mrs|Ms|Miss|Mx|Dr|Fr|Br|Sr)\.?\s+/i;
const PLACEHOLDERS = new Set(["", "unknown", "n/a", "-", "—"]);

/** FNV-1a: small, fast and stable across browsers. */
function hash(value: string, salt: number): number {
  let h = (0x811c9dc5 ^ salt) >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function pick<T>(list: readonly T[], key: string, salt: number): T {
  return list[hash(key, salt) % list.length];
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDERS.has(value.trim().toLowerCase());
}

/** "Mrs Colleen Wheeler" → "Mrs Ava Turner". Keeps the title, if there is one. */
export function fakePersonName(real: string): string {
  const name = real.trim();
  if (isPlaceholder(name)) return real;
  const title = name.match(TITLE)?.[0] ?? "";
  const key = name.slice(title.length).toLowerCase();
  return `${title}${pick(FIRST_NAMES, key, 1)} ${pick(LAST_NAMES, key, 2)}`;
}

/** A comma-separated list of people, e.g. message recipients. */
export function fakePeople(real: string): string {
  return real
    .split(/\s*,\s*/)
    .map((person) => fakePersonName(person))
    .join(", ");
}

/** "MS20" → "K14": a letter and a number. */
export function fakeRoom(real: string): string {
  const room = real.trim();
  if (isPlaceholder(room)) return real;
  const key = room.toUpperCase();
  const letter = String.fromCharCode(65 + (hash(key, 3) % 26));
  return `${letter}${1 + (hash(key, 4) % 40)}`;
}

/** Keeps the shape of an ID ("STU0218147 // 34420260") but changes every digit. */
export function fakeDigits(real: string): string {
  let position = 0;
  return real.replace(/\d/g, () => String(hash(real, 10 + position++) % 10));
}

/** "10Loyola" → "10Karri": keeps the year level, swaps the house. */
export function fakeHouse(real: string): string {
  const house = real.trim();
  if (!house) return real;
  const year = house.match(/^\d+/)?.[0] ?? "";
  return `${year}${pick(HOUSES, house.slice(year.length).toLowerCase(), 5)}`;
}

/** Initials for an avatar, e.g. "CW" → "TR". */
export function fakeInitials(real: string): string {
  const initials = real.trim();
  if (!initials) return real;
  return [...initials]
    .map((_, i) => pick(FIRST_NAMES, `${initials}:${i}`, 6)[0])
    .join("");
}

/** Picks a stand-in from a list, e.g. a made-up message subject. */
export function fakeFrom<T>(list: readonly T[], real: string): T {
  return pick(list, real.trim().toLowerCase(), 7);
}
