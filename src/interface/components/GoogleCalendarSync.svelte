<script lang="ts">
  import browser from "webextension-polyfill"
  import Button from "./Button.svelte"
  import Switch from "./Switch.svelte"
  import Select from "./Select.svelte"
  import { CALENDAR_NAME, SYNC_WEEKS_OPTIONS } from "@/seqta/utils/googleCalendar/config"
  import type { GoogleCalendarStatus } from "@/seqta/utils/googleCalendar/storage"

  /** The toolbar popup can't read the SEQTA timetable, so syncing needs the in-page settings. */
  let { standalone = false } = $props<{ standalone?: boolean }>()

  let status = $state<GoogleCalendarStatus | null>(null)
  let busy = $state(false)
  let message = $state("")

  const send = (type: string, payload: Record<string, unknown> = {}): Promise<any> =>
    browser.runtime.sendMessage({ type, ...payload })

  async function refreshStatus() {
    status = (await send("googleCalendarStatus")) as GoogleCalendarStatus
  }

  async function run(task: () => Promise<void>) {
    busy = true
    message = ""
    try {
      await task()
    } catch (err) {
      message = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
      await refreshStatus()
    }
  }

  const connect = () =>
    run(async () => {
      message = "Finish signing in to Google in the new tab…"
      const res = (await send("googleCalendarConnect")) as { success?: boolean; error?: string }
      message = res?.success ? `Connected. Lessons sync to the "${CALENDAR_NAME}" calendar.` : (res?.error ?? "Couldn't connect.")
      if (res?.success && !standalone) await syncNow()
    })

  const syncNow = () =>
    run(async () => {
      const { syncGoogleCalendar } = await import("@/seqta/utils/googleCalendar/sync")
      const res = await syncGoogleCalendar((progress) => (message = progress))
      if (!res.success) {
        message = res.error ?? "Sync failed."
        return
      }
      const changes = [
        res.created && `${res.created} added`,
        res.updated && `${res.updated} updated`,
        res.deleted && `${res.deleted} removed`,
        res.failed && `${res.failed} failed`,
      ].filter(Boolean)
      message = changes.length ? `Synced: ${changes.join(", ")}.` : "Already up to date."
    })

  const disconnect = () =>
    run(async () => {
      await send("googleCalendarDisconnect")
      message = `Disconnected. The "${CALENDAR_NAME}" calendar stays in Google until you delete it there.`
    })

  const updateSettings = (patch: { weeksAhead?: number; autoSync?: boolean }) =>
    send("googleCalendarUpdateSettings", patch).then((s: GoogleCalendarStatus) => (status = s))

  function lastSyncLabel(at?: number): string {
    if (!at) return "Not synced yet"
    return `Last synced ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
  }

  $effect(() => {
    void refreshStatus()
  })
</script>

<div class="flex justify-between items-center px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm font-bold">Google Calendar</h2>
    <p class="text-xs">
      {#if status?.connected}
        {lastSyncLabel(status.lastSyncAt)}
      {:else}
        Sync your timetable to a separate Google calendar
      {/if}
    </p>
  </div>
  <div>
    {#if status?.connected}
      <Button
        onClick={syncNow}
        text={busy ? "Syncing…" : "Sync now"}
        disabled={busy || standalone}
      />
    {:else}
      <Button onClick={connect} text={busy ? "Connecting…" : "Connect"} disabled={busy || !status} />
    {/if}
  </div>
</div>

{#if status?.connected}
  <div class="flex justify-between items-center px-4 py-3 pl-6 border-t border-zinc-100 dark:border-zinc-700/50">
    <div class="pr-4">
      <h2 class="text-sm font-bold">Auto-sync</h2>
      <p class="text-xs">Sync once a day when you open SEQTA</p>
    </div>
    <div>
      <Switch state={status.autoSync} onChange={(autoSync: boolean) => updateSettings({ autoSync })} />
    </div>
  </div>
  <div class="flex justify-between items-center px-4 py-3 pl-6 border-t border-zinc-100 dark:border-zinc-700/50">
    <div class="pr-4">
      <h2 class="text-sm font-bold">Weeks ahead</h2>
      <p class="text-xs">How far ahead to keep in the calendar</p>
    </div>
    <div>
      <Select
        state={String(status.weeksAhead)}
        onChange={(value: string) => updateSettings({ weeksAhead: Number(value) })}
        options={SYNC_WEEKS_OPTIONS.map((weeks) => ({ value: String(weeks), label: `${weeks} weeks` }))}
      />
    </div>
  </div>
  <div class="flex justify-between items-center px-4 py-3 pl-6 border-t border-zinc-100 dark:border-zinc-700/50">
    <div class="pr-4">
      <h2 class="text-sm font-bold">Disconnect</h2>
      <p class="text-xs">Stop syncing and forget the Google sign-in</p>
    </div>
    <div>
      <Button onClick={disconnect} text="Disconnect" disabled={busy} />
    </div>
  </div>
{/if}

{#if standalone && status?.connected}
  <p class="px-4 pb-3 text-xs text-zinc-500 dark:text-zinc-400">Open SEQTA and use the settings there to sync now.</p>
{/if}
{#if message}
  <p class="px-4 pb-3 text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
{/if}
