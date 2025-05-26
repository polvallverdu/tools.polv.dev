<script lang="ts">
  import { Button } from "@/components/ui/button";
  import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
  import { ArrowRightIcon, CheckIcon, DownloadIcon, ImageIcon, PaletteIcon } from "@lucide/svelte";
  import SvelteSeo from "svelte-seo";

  function promptPWA() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
      });
    }
  }

  const isPWA = $derived(
    typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
  );
</script>

<SvelteSeo
  title="Pol Tools"
  description="These are AI tools that run purely in your browser, that are useful for stuff I do. (and maybe they are useful for you too 😉)"
/>

<div class="mx-auto max-w-screen-lg">
  <h1 class="py-4 text-center text-4xl font-bold">Welcome to Pol Tools</h1>
  <h2 class="mb-4 text-center text-xl">
    These are tools that run purely in your browser, which means:
  </h2>

  <div class="flex w-full flex-wrap justify-center gap-4">
    <Card class="min-w-[300px]">
      <CardHeader>
        <CardTitle>✅ Nothing leaves your browser</CardTitle>
        <CardDescription>
          No data is sent to any servers. Your information is safely stored in your browser.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card class="min-w-[300px]">
      <CardHeader>
        <CardTitle>✅ No account needed</CardTitle>
        <CardDescription>
          Since everything is local, you don't need to create an account or anything. Just use it.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card class="min-w-[300px]">
      <CardHeader>
        <CardTitle>✅ Offline-first</CardTitle>
        <CardDescription>
          Everything will be cache'd offline, so you can use it even when you're offline. You can
          even install it as an app on your computer or phone.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        {#if isPWA}
          <Button disabled variant="outline">
            <CheckIcon class="h-4 w-4" />
            Already installed
          </Button>
        {:else}
          <Button onclick={promptPWA}>
            <DownloadIcon class="h-4 w-4" />
            Install as app
          </Button>
        {/if}
      </CardFooter>
    </Card>
  </div>

  <h3 class="py-4 text-center text-xl">Select a tool to get started:</h3>

  <div class="flex flex-wrap justify-center gap-4">
    <a href="/background-remover" class="group transition-transform hover:translate-y-[-2px]">
      <Card class="hover:bg-accent min-w-[300px] transition-colors">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <ImageIcon class="h-4 w-4" /> Background Remover
          </CardTitle>
          <CardDescription>
            Remove the background of an image using various AI models locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button>
            <ArrowRightIcon class="h-4 w-4" />
            Go to tool
          </Button>
        </CardFooter>
      </Card>
    </a>

    <a href="/css-colors-checker" class="group transition-transform hover:translate-y-[-2px]">
      <Card class="hover:bg-accent min-w-[300px] transition-colors">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <PaletteIcon class="h-4 w-4" /> CSS Colors Checker
          </CardTitle>
          <CardDescription>
            Check and convert CSS colors between different formats (HEX, RGB, HSL, HWB, OKLAB,
            OKLCH)
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button>
            <ArrowRightIcon class="h-4 w-4" />
            Go to tool
          </Button>
        </CardFooter>
      </Card>
    </a>
  </div>
</div>
