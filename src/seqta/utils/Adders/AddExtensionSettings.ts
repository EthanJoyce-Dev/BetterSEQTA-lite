import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";
import { SettingsResizer } from "@/seqta/ui/SettingsResizer";

let isSettingsRendered = false;

/** The settings UI (Svelte, React colour picker, CodeMirror) is only fetched when first needed. */
export function loadSettingsUI() {
  return Promise.all([
    import("@/interface/main"),
    import("@/interface/pages/settings.svelte"),
  ]);
}

function extensionOutsideClickHandler(extensionPopup: HTMLElement) {
  return (event: MouseEvent) => {
    if (!SettingsClicked) return;

    if (!(event.target as HTMLElement).closest("#AddedSettings")) {
      if (event.target == extensionPopup) return;
      changeSettingsClicked(closeExtensionPopup());
    }
  };
}

export function addExtensionSettings() {
  if (document.getElementById("ExtensionPopup")) return;

  const extensionPopup = document.createElement("div");
  extensionPopup.classList.add("outside-container", "hide");
  extensionPopup.id = "ExtensionPopup";

  const extensionContainer =
    document.querySelector("#container") ?? document.getElementById("container");
  const mountParent = extensionContainer ?? document.body;
  mountParent.appendChild(extensionPopup);

  new SettingsResizer();

  const handler = extensionOutsideClickHandler(extensionPopup);
  (extensionContainer ?? document.body).addEventListener("click", handler, false);
}

export async function renderSettingsIfNeeded() {
  if (isSettingsRendered) return;

  const extensionPopup = document.getElementById("ExtensionPopup");
  if (!extensionPopup) return;

  try {
    isSettingsRendered = true;
    const shadow = extensionPopup.attachShadow({ mode: "open" });
    const [{ default: renderSvelte }, { default: Settings }] =
      await loadSettingsUI();
    renderSvelte(Settings, shadow);
  } catch (err) {
    console.error(err);
  }
}
