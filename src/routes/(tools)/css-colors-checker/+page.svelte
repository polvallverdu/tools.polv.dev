<script lang="ts">
  import { useTable } from "svelte-tinybase";
  import { db } from "@/db/db.svelte";
  import * as culori from "culori";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Separator } from "@/components/ui/separator";
  import { Save, Trash2, Copy, CheckCircle, Share } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { untrack } from "svelte";
  import { page } from "$app/state";

  // Reactive colors table
  const colors = useTable(db, "colors");

  // State
  let colorName = $state("");
  let colorInput = $state("#ff0000");
  let copiedFormat = $state<string | null>(null);

  $effect(() => {
    const currentUrl = untrack(() => page.url);
    currentUrl.searchParams.set("color", colorInput);
    goto(currentUrl.href, { replaceState: false, keepFocus: true, noScroll: true });
  });

  // Parsed color object
  let parsedColor = $derived.by(() => {
    if (!colorInput) return null;

    try {
      return culori.parse(colorInput);
    } catch {
      return null;
    }
  });
  const colorHex = $derived(parsedColor ? culori.formatHex(parsedColor) : null);

  // Color formats
  let colorFormats = $derived.by(() => {
    if (!parsedColor) return null;

    return {
      hex: culori.formatHex(parsedColor),
      rgb: culori.formatRgb(parsedColor),
      hsl: culori.formatHsl(parsedColor),
      hwb: culori.formatCss(culori.hwb(parsedColor)),
      oklab: culori.formatCss(culori.oklab(parsedColor)),
      oklch: culori.formatCss(culori.oklch(parsedColor)),
    };
  });

  // Saved colors
  let savedColors = $derived(
    Object.entries(colors.value)
      .map(([id, color]) => ({ id, ...color }))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }),
  );

  function handlePickerInput(input: string) {
    colorInput = input;
  }

  function saveColor() {
    if (!parsedColor || !colorName.trim()) {
      toast.error("Please enter a color name and valid color");
      return;
    }

    if (!colorFormats) return;

    const id = crypto.randomUUID();
    db.setRow("colors", id, {
      name: colorName.trim(),
      hex: colorFormats.hex,
      rgb: colorFormats.rgb,
      hsl: colorFormats.hsl,
      hwb: colorFormats.hwb,
      oklab: colorFormats.oklab,
      oklch: colorFormats.oklch,
      createdAt: new Date().toISOString(),
    });

    colorName = "";
    toast.success("Color saved successfully!");
  }

  function deleteColor(id: string) {
    db.delRow("colors", id);
    toast.success("Color deleted");
  }

  function loadColor(color: any) {
    colorInput = color.hex;
  }

  async function copyToClipboard(text: string, format: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedFormat = format;
      toast.success(`${format.toUpperCase()} copied to clipboard`);
      setTimeout(() => {
        copiedFormat = null;
      }, 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  function getContrastColor(backgroundColor: string | undefined): string {
    if (!backgroundColor) return "#000000";
    const color = culori.parse(backgroundColor);
    if (!color) return "#000000";

    const luminance = culori.wcagLuminance(color);
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  const currentUrl = untrack(() => page.url);
  const colorParam = currentUrl.searchParams.get("color");
  if (colorParam) {
    colorInput = colorParam;
  }

  const shareableLink = $derived(page.url.href);
  let copiedShareLinkFeedback = $state(false);

  async function handleCopyShareLink() {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast.success("Shareable link copied to clipboard!");
      copiedShareLinkFeedback = true;
      setTimeout(() => {
        copiedShareLinkFeedback = false;
      }, 2000);
    } catch (err) {
      toast.error("Failed to copy link.");
      console.error("Failed to copy share link:", err);
    }
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      toast.error("Native sharing is not supported on this device");
      return;
    }

    if (!shareableLink || !colorFormats) return;

    try {
      await navigator.share({
        title: "CSS Color Tool",
        text: `Check out this color: ${colorFormats.hex} (${colorInput})`,
        url: shareableLink,
      });
    } catch (err) {
      // User cancelled or sharing failed
      if ((err as Error).name !== "AbortError") {
        toast.error("Failed to share");
        console.error("Failed to share:", err);
      }
    }
  }
</script>

<svelte:head>
  <title>CSS Colors Checker - Tools</title>
  <meta
    name="description"
    content="Check and convert CSS colors between different formats (HEX, RGB, HSL, HWB, OKLAB, OKLCH)"
  />
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-8 pb-6">
  <div class="space-y-2 text-center">
    <h1 class="text-3xl font-bold">CSS Colors Checker</h1>
    <p class="text-muted-foreground">
      Convert and preview colors in different formats: HEX, RGB, HSL, HWB, OKLAB, OKLCH
    </p>
  </div>

  <div class="flex grid-cols-2 grid-rows-4 flex-col gap-4 lg:grid">
    <!-- Item 1: Input & Preview Card -->
    <Card class="row-span-2">
      <CardHeader>
        <CardTitle>Color Input</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-6">
          <div class="space-y-4">
            <div class="flex gap-2">
              <Input
                id="color-picker"
                type="color"
                value={colorHex}
                oninput={(e) => handlePickerInput(e.currentTarget.value)}
                class="border-input bg-background h-10 w-16 cursor-pointer rounded border"
              />
              <Input
                id="color-input"
                bind:value={colorInput}
                placeholder="Enter color (e.g., #ff0000, rgb(255,0,0), red)"
                class="font-mono"
              />
            </div>
          </div>

          {#if parsedColor && colorFormats}
            <div class="space-y-4">
              <Separator />
              <!-- Color Preview -->
              <div class="space-y-2">
                <Label>Color Preview</Label>
                <div
                  class="border-input flex h-20 w-full items-center justify-center rounded-md border text-sm font-medium"
                  style="background-color: {colorFormats.hex}; color: {getContrastColor(
                    colorFormats.hex,
                  )}"
                >
                  {colorFormats.hex}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>

    <!-- Item 2: Color Formats Card -->
    <Card class="col-start-2 row-span-4 row-start-1">
      <CardHeader>
        <CardTitle>Color Formats</CardTitle>
      </CardHeader>
      <CardContent>
        {#if parsedColor && colorFormats}
          <div class="space-y-3">
            {#each Object.entries(colorFormats) as [format, value]}
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <Label class="text-sm font-medium uppercase">{format}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => copyToClipboard(value, format)}
                    class="h-8 px-2"
                  >
                    {#if copiedFormat === format}
                      <CheckCircle class="h-3 w-3 text-green-500" />
                    {:else}
                      <Copy class="h-3 w-3" />
                    {/if}
                  </Button>
                </div>
                <div class="flex gap-2">
                  <div
                    class="border-input h-8 w-8 flex-shrink-0 rounded border"
                    style="background-color: {value}"
                  ></div>
                  <Input {value} readonly class="bg-muted font-mono text-sm" />
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-muted-foreground py-8 text-center">
            <p>Enter a valid color to see format conversions</p>
          </div>
        {/if}
      </CardContent>
    </Card>

    <!-- Item 3: Share This Color Card -->
    <Card>
      <CardHeader>
        <CardTitle>Share This Color</CardTitle>
        <CardDescription>
          Share this link to send the current color and its conversions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex gap-2">
          <Input
            type="text"
            value={shareableLink}
            readonly
            placeholder="Link will appear here"
            class="flex-1 font-mono"
          />
          <Button
            onclick={handleCopyShareLink}
            variant="outline"
            disabled={!shareableLink || copiedShareLinkFeedback}
            size="icon"
          >
            {#if copiedShareLinkFeedback}
              <CheckCircle class="text-green-500" />
            {:else}
              <Copy />
            {/if}
          </Button>
          <Button
            onclick={handleNativeShare}
            variant="outline"
            disabled={!shareableLink}
            title="Share using your device's native sharing options"
            size="icon"
          >
            <Share />
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Item 4: Save Current Color Card (conditional) -->
    <Card>
      <CardHeader>
        <CardTitle>Save Current Color</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <Label for="color-name">Color Name</Label>
          <div class="flex gap-2">
            <Input id="color-name" bind:value={colorName} placeholder="Enter color name..." />
            <Button
              onclick={saveColor}
              disabled={!colorName.trim() || !parsedColor || !colorFormats}
            >
              <Save class="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Saved Colors -->
  <Card>
    <CardHeader>
      <CardTitle>Saved Colors</CardTitle>
      <CardDescription>
        {savedColors.length} color{savedColors.length !== 1 ? "s" : ""}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if savedColors.length > 0}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each savedColors as color (color.id)}
            <div class="border-input space-y-3 rounded-lg border p-4">
              <div class="flex items-center justify-between">
                <h4 class="truncate font-medium">{color.name}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => deleteColor(color.id)}
                  class="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>

              <div
                class="border-input flex h-12 w-full cursor-pointer items-center justify-center rounded border text-sm font-medium transition-transform hover:scale-[1.02]"
                style="background-color: {color.hex}; color: {getContrastColor(color.hex)}"
                onclick={() => loadColor(color)}
                role="button"
                tabindex="0"
              >
                {color.hex}
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="space-y-1">
                  <div class="text-muted-foreground">RGB</div>
                  <div class="bg-muted rounded px-2 py-1 font-mono text-xs">
                    {color.rgb ?? "N/A"}
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="text-muted-foreground">HSL</div>
                  <div class="bg-muted rounded px-2 py-1 font-mono text-xs">
                    {color.hsl ?? "N/A"}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-muted-foreground py-8 text-center">
          <p>No saved colors yet</p>
          <p class="text-sm">Save colors to build your palette</p>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
