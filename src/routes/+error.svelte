<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Button } from "@/components/ui/button";
  import { ArrowLeftIcon, HomeIcon } from "@lucide/svelte";

  const status = $derived(page.status);
  const message = $derived(page.error?.message ?? "Something went wrong");

  function getErrorTitle(status: number): string {
    switch (status) {
      case 404:
        return "Page Not Found";
      case 403:
        return "Access Forbidden";
      case 500:
        return "Internal Server Error";
      default:
        return "Something went wrong";
    }
  }

  function goHome(): void {
    goto("/");
  }

  function goBack(): void {
    history.back();
  }
</script>

<svelte:head>
  <title>Error {status}</title>
</svelte:head>

<div class="flex h-full flex-col items-center justify-center text-center">
  <h1 class="text-9xl font-bold text-gray-200">{status}</h1>
  <h2 class="mt-4 text-2xl font-semibold text-gray-900">{getErrorTitle(status)}</h2>
  <p class="mt-2 mb-8 text-gray-600">{message}</p>

  <div class="flex justify-center gap-4">
    <Button onclick={goHome}><HomeIcon class="h-4 w-4" /> Go Home</Button>
    <Button onclick={goBack} variant="secondary"><ArrowLeftIcon class="h-4 w-4" /> Go Back</Button>
  </div>
</div>
