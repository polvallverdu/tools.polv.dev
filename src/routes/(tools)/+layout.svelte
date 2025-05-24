<script lang="ts">
  import { isDbInitialized } from "@/db/db.svelte";
  import { Loader2Icon } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

{#if typeof window !== "undefined" && isDbInitialized()}
  {@render children()}
{:else}
  <div class="flex h-full w-full items-center justify-center">
    <Loader2Icon class="size-10 animate-spin" />
  </div>
{/if}
