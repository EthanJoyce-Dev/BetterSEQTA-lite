import {
  fakeDigits,
  fakeFrom,
  fakeHouse,
  fakeInitials,
  fakePeople,
  fakePersonName,
  fakeRoom,
} from "./pseudonyms";

/**
 * Dev mode's privacy screen: swaps names, rooms, the student ID and house for
 * fake ones so screenshots of real pages are safe to share. Subjects, times and
 * marks stay real. Turning it off reloads the page to bring the real text back.
 */

const MESSAGE_SUBJECTS = [
  "Science project due soon",
  "Excursion reminder",
  "School assembly",
  "Sports day",
  "Parent-teacher meetings",
  "Book fair",
  "Music concert",
  "Club meeting",
  "Field trip",
  "Assessment feedback",
] as const;

interface Rule {
  selector: string;
  fake: (text: string) => string;
}

const RULES: Rule[] = [
  // Top bar
  { selector: ".userInfoName", fake: fakePersonName },
  { selector: ".userInfoText > .userInfoCode", fake: fakeDigits },
  { selector: ".userInfohouse", fake: fakeHouse },
  // Home: today's lessons (subject, teacher, room) and notices
  { selector: "#day-container .day > h3:first-of-type", fake: fakePeople },
  { selector: "#day-container .day > h3:last-of-type", fake: fakeRoom },
  { selector: ".notice-staff", fake: fakePeople },
  // Timetable and its lesson popup
  {
    selector: ".timetablepage .entry .teacher, .timetablepage .quickbar .meta .teacher",
    fake: fakePeople,
  },
  {
    selector: ".timetablepage .entry .room, .timetablepage .quickbar .meta .room",
    fake: fakeRoom,
  },
  // Direqt Messages
  { selector: '[class*="MessageList__value___"]', fake: fakePeople },
  {
    selector: '[class*="MessageList__subject___"]',
    fake: (subject) => fakeFrom(MESSAGE_SUBJECTS, subject),
  },
];

const AVATAR_SELECTOR = '[class*="Avatar__Avatar___"]';

/** Text this screen wrote, so a second pass leaves it alone. */
const written = new Set<string>();

function replaceText(el: Element, fake: (text: string) => string) {
  const text = el.textContent ?? "";
  if (!text.trim() || written.has(text)) return;
  const replacement = fake(text);
  if (replacement === text) return;
  written.add(replacement);
  el.textContent = replacement;
}

/** Hides the photo and fakes the initials, keeping the avatar's own markup. */
function replaceAvatar(el: Element) {
  if (el instanceof HTMLElement && el.style.backgroundImage) {
    el.style.backgroundImage = "none";
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    if (!text.trim() || written.has(text)) continue;
    const replacement = fakeInitials(text);
    written.add(replacement);
    node.textContent = replacement;
  }
}

function scrub() {
  frame = 0;
  for (const rule of RULES) {
    document.querySelectorAll(rule.selector).forEach((el) => replaceText(el, rule.fake));
  }
  document.querySelectorAll(AVATAR_SELECTOR).forEach(replaceAvatar);
}

let observer: MutationObserver | null = null;
let frame = 0;

/** Batches page changes into one pass per frame, before the browser paints. */
function scheduleScrub() {
  if (!frame) frame = requestAnimationFrame(scrub);
}

export default function hideSensitiveContent() {
  scrub();
  if (observer) return;
  observer = new MutationObserver(scheduleScrub);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function stopHidingSensitiveContent() {
  observer?.disconnect();
  observer = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}
