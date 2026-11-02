<script lang="ts">
  import TabbedContainer from "../components/TabbedContainer.svelte";
  import Settings from "./settings/general.svelte";
  import Shortcuts from "./settings/shortcuts.svelte";
  import Theme from "./settings/theme.svelte";
  import browser from "webextension-polyfill";

  import { standalone as StandaloneStore } from "../utils/standalone.svelte";
  import { onMount } from "svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";

  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
  import { OpenAboutPage } from "@/seqta/utils/Openers/OpenAboutPage";

  import ColourPicker from "../components/ColourPicker.svelte";
  import FontPickerModal from "../components/FontPickerModal.svelte";
  import DisclaimerModal from "../components/DisclaimerModal.svelte";
  import { settingsPopup } from "../hooks/SettingsPopup";
  import { checkForUpdate, installUpdate, type UpdateInfo } from "@/interface/utils/updater";

  let devModeSequence = "";
  let settingsActiveTab = $state(0);
  let showDisclaimerModal = $state(false);
  let disclaimerCallbacks = $state<{ onConfirm: () => void, onCancel: () => void } | null>(null);
  let disclaimerTitle = $state("Confirm");
  let disclaimerMessage = $state("");
  let update = $state<UpdateInfo | null>(null);
  let updateStarted = $state(false);

  const startUpdate = async () => {
    if (!update || updateStarted) return;
    updateStarted = update.autoInstall;
    await installUpdate(update);
  };

  const handleDevModeToggle = () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      devModeSequence += event.key.toLowerCase();
      if (devModeSequence.includes("dev")) {
        document.removeEventListener("keydown", handleKeyDown);
        settingsState.devMode = true;
        alert("Dev mode is now enabled");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      document.removeEventListener("keydown", handleKeyDown);
      devModeSequence = "";
    }, 10000);
  };

  const openColourPicker = () => {
    showColourPicker = true;
  };

  const openFontPicker = () => {
    showFontPicker = true;
  };

  const openChangelog = () => {
    window.open("https://github.com/EthanJoyce-Dev/BetterSEQTA-lite/commits/main", "_blank");
    closeExtensionPopup();
  };

  const openAbout = () => {
    OpenAboutPage();
    closeExtensionPopup();
  };

  const openPrivacyStatement = () => {
    window.open("https://betterseqta.org/privacy", "_blank");
    closeExtensionPopup();
  };

  let { standalone } = $props<{ standalone?: boolean }>();
  let showColourPicker = $state<boolean>(false);
  let showFontPicker = $state<boolean>(false);

  const showDisclaimer = (onConfirm: () => void, onCancel: () => void, title?: string, message?: string) => {
    disclaimerCallbacks = { onConfirm, onCancel };
    disclaimerTitle = title ?? "Confirm";
    disclaimerMessage = message ?? "";
    showDisclaimerModal = true;
  };

  onMount(() => {
    settingsPopup.addListener(() => {
      showColourPicker = false;
      showFontPicker = false;
    });

    if (standalone) {
      StandaloneStore.setStandalone(true);
    }

    void checkForUpdate().then((info) => {
      update = info;
    });
  });
</script>

<div
  class="relative w-[384px] no-scrollbar shadow-2xl {$settingsState.DarkMode
    ? 'dark'
    : ''} {standalone ? 'h-[600px]' : 'h-full rounded-xl'} overflow-clip"
>
  <div
    class="flex relative flex-col gap-2 h-full overflow-clip bg-white dark:bg-zinc-800 dark:text-white"
  >
    <div
      class="grid place-items-center border-b border-b-zinc-200/40 dark:border-b-zinc-700/40"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={browser.runtime.getURL(
          "resources/icons/betterseqta-dark-full.png",
        )}
        class="w-4/5 dark:hidden"
        alt="Light logo"
        onclick={handleDevModeToggle}
      />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={browser.runtime.getURL(
          "resources/icons/betterseqta-light-full.png",
        )}
        class="hidden w-4/5 dark:block"
        alt="Dark logo"
        onclick={handleDevModeToggle}
      />

      {#if !standalone}
        <div class="flex absolute top-1 right-1 gap-1 items-start">
          {#if update?.available}
            <button
              type="button"
              onclick={startUpdate}
              class="px-1.5 py-0.5 mt-1.5 mr-0.5 text-[10px] font-semibold leading-tight text-white rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
              title={update.autoInstall ? "Install the update now" : "Open the release to download it"}
            >
              {updateStarted ? "Installing…" : `Update to ${update.latest}`}
            </button>
          {/if}
          <div class="flex gap-1 items-center">
          <button
            onclick={openAbout}
            class="flex justify-center items-center w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
          >
            {"\ueb73"}
          </button>

          <button
            onclick={openChangelog}
            class="flex justify-center items-center w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
          >
            {"\ue929"}
          </button>

          <button
            onclick={openPrivacyStatement}
            class="flex justify-center items-center w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
            aria-label="Privacy Statement"
          >
            {"\uecba"}
          </button>
          </div>
        </div>
      {/if}
    </div>

    <TabbedContainer
      bind:activeTab={settingsActiveTab}
      tabs={[
        {
          title: "Settings",
          Content: Settings,
          props: { showColourPicker: openColourPicker, showFontPicker: openFontPicker, showDisclaimer, standalone },
        },
        { title: "Shortcuts", Content: Shortcuts },
        { title: "Themes", Content: Theme },
      ]}
    />
  </div>

  {#if showColourPicker}
    <ColourPicker
      hidePicker={() => {
        showColourPicker = false;
      }}
    />
  {/if}
</div>

{#if showFontPicker}
  <FontPickerModal
    hidePicker={() => {
      showFontPicker = false;
    }}
  />
{/if}

{#if showDisclaimerModal && disclaimerCallbacks}
  <DisclaimerModal
    title={disclaimerTitle}
    message={disclaimerMessage}
    onConfirm={() => {
      disclaimerCallbacks?.onConfirm();
      showDisclaimerModal = false;
      disclaimerCallbacks = null;
    }}
    onCancel={() => {
      disclaimerCallbacks?.onCancel();
      showDisclaimerModal = false;
      disclaimerCallbacks = null;
    }}
  />
{/if}
