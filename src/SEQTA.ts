// This content script runs on every page, so it must stay tiny: it only decides
// whether the page is SEQTA, and loads the real extension (seqta/boot) if so.

let decided = false;

function isSeqtaPage(): boolean {
  // Checked on the raw comment node due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
  const hasSEQTAText =
    document.childNodes[1]?.textContent?.includes(
      "Copyright (c) SEQTA Software",
    ) ?? false;
  return (
    hasSEQTAText &&
    (document.title.includes("SEQTA Learn") ||
      document.title.includes("SEQTA Engage"))
  );
}

/** Returns true once there is enough of the document parsed to decide. */
function decide(): boolean {
  if (decided) return true;
  // Wait until the parser is past <title> (or into <body>) so the title is complete.
  if (!document.body && !document.querySelector("title")?.nextSibling) {
    return false;
  }
  decided = true;
  if (isSeqtaPage()) {
    // Vite's CSS preload links point at the SEQTA origin and fail; the import
    // itself still works, so don't let that failure abort it.
    window.addEventListener("vite:preloadError", (e) => e.preventDefault());
    void import("@/seqta/boot");
  }
  return true;
}

if (!decide()) {
  const observer = new MutationObserver(() => {
    if (decide()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
}
