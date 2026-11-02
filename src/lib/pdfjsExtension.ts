import browser from "webextension-polyfill";

/** Static copies in `src/public` (see `scripts/copy-pdfjs-assets.mjs`, manifest web_accessible_resources). */
const PDF_WORKER_RESOURCE = "resources/pdfjs/pdf.worker.min.mjs";
const PDF_LEGACY_RESOURCE = "resources/pdfjs/pdf.legacy.min.mjs";

function extensionAssetUrl(relativePath: string): string {
  return browser.runtime.getURL(relativePath.replace(/^\/+/, ""));
}

/**
 * pdf.js is ~450 KB, so it is only imported when a PDF actually needs reading.
 * The worker is configured before pdfjs spawns it (content-script / extension isolate).
 */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = extensionAssetUrl(PDF_WORKER_RESOURCE);
  return pdfjs;
}

/** Page-context script on Firefox must load these chrome-extension:// URLs (see web_accessible_resources). */
export function getPdfjsPageContextUrls(): { lib: string; worker: string } {
  return {
    lib: extensionAssetUrl(PDF_LEGACY_RESOURCE),
    worker: extensionAssetUrl(PDF_WORKER_RESOURCE),
  };
}
