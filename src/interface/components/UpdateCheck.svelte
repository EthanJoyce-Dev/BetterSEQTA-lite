<script lang="ts">
  import Button from "./Button.svelte"
  import { checkForUpdate, installUpdate, type UpdateInfo } from "@/interface/utils/updater"

  let info = $state<UpdateInfo | null>(null)
  let busy = $state(false)
  let message = $state("")

  async function run(task: () => Promise<void>) {
    busy = true
    message = ""
    try {
      await task()
    } catch (err) {
      message = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
    }
  }

  const check = (force: boolean) =>
    run(async () => {
      info = await checkForUpdate(force)
      if (info.error) message = `Couldn't check for updates: ${info.error}`
      else if (force && !info.available) message = "You're on the latest version."
    })

  const update = () =>
    run(async () => {
      if (info) message = await installUpdate(info)
    })

  $effect(() => {
    void check(false)
  })
</script>

<div class="flex justify-between items-center px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm font-bold">Updates</h2>
    <p class="text-xs">
      {#if info?.available}
        Version {info.latest} is available (you have {info.current})
      {:else}
        Version {info?.current ?? "…"}{info?.autoInstall ? " · updates install automatically" : ""}
      {/if}
    </p>
  </div>
  <div>
    {#if info?.available}
      <Button onClick={update} text={busy ? "Updating…" : "Update"} disabled={busy} />
    {:else}
      <Button onClick={() => check(true)} text={busy ? "Checking…" : "Check now"} disabled={busy} />
    {/if}
  </div>
</div>
{#if message}
  <p class="px-4 pb-3 text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
{/if}
