<script lang="ts">
  import { useTable } from "svelte-tinybase";
  import { db } from "@/db/db.svelte";
  import * as culori from "culori";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Separator } from "@/components/ui/separator";
  import { Save, Trash2, Copy, CheckCircle, Share, Sun, Moon, Lightbulb } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { untrack } from "svelte";
  import { page } from "$app/state";
  import { Badge } from "@/components/ui/badge";

  // Reactive colors table
  const colors = useTable(db, "colors");

  // State
  let colorName = $state("");
  let colorInput = $state("#ff0000");
  let copiedFormat = $state<string | null>(null);
  let roundDecimals = $state(true);
  const DECIMAL_PLACES = 4;

  // Helper to round numbers in CSS color strings
  function roundCssDecimals(cssString: string, decimals: number): string {
    return cssString.replace(/(\d+\.\d+)/g, (match) => {
      const num = parseFloat(match);
      return num.toFixed(decimals).replace(/\.?0+$/, (m) => (m.includes(".") ? "" : m));
    });
  }

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

    const formats = {
      hex: culori.formatHex(parsedColor),
      rgb: culori.formatRgb(parsedColor),
      hsl: culori.formatHsl(parsedColor),
      hwb: culori.formatCss(culori.hwb(parsedColor)),
      oklab: culori.formatCss(culori.oklab(parsedColor)),
      oklch: culori.formatCss(culori.oklch(parsedColor)),
    };

    if (roundDecimals) {
      return {
        hex: formats.hex,
        rgb: roundCssDecimals(formats.rgb, DECIMAL_PLACES),
        hsl: roundCssDecimals(formats.hsl, DECIMAL_PLACES),
        hwb: roundCssDecimals(formats.hwb, DECIMAL_PLACES),
        oklab: roundCssDecimals(formats.oklab, DECIMAL_PLACES),
        oklch: roundCssDecimals(formats.oklch, DECIMAL_PLACES),
      };
    }

    return formats;
  });

  // Contrast checking
  const WHITE = culori.parse("#ffffff")!;
  const BLACK = culori.parse("#000000")!;
  const LIGHT_BG = culori.parse("#f8fafc")!; // slate-50
  const DARK_BG = culori.parse("#0f172a")!; // slate-900

  type ContrastRating = "AAA" | "AA" | "AA Large" | "Fail";

  function getContrastRating(ratio: number): ContrastRating {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    if (ratio >= 3) return "AA Large";
    return "Fail";
  }

  function getRatingColor(rating: ContrastRating): string {
    switch (rating) {
      case "AAA":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "AA":
        return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "AA Large":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
      case "Fail":
        return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
    }
  }

  let contrastInfo = $derived.by(() => {
    if (!parsedColor) return null;

    const lightContrast = culori.wcagContrast(parsedColor, LIGHT_BG);
    const darkContrast = culori.wcagContrast(parsedColor, DARK_BG);
    const whiteContrast = culori.wcagContrast(parsedColor, WHITE);
    const blackContrast = culori.wcagContrast(parsedColor, BLACK);

    return {
      light: {
        ratio: lightContrast,
        rating: getContrastRating(lightContrast),
      },
      dark: {
        ratio: darkContrast,
        rating: getContrastRating(darkContrast),
      },
      bestTextOnColor: whiteContrast > blackContrast ? "white" : "black",
      whiteContrast,
      blackContrast,
    };
  });

  // Generate better color alternatives for poor contrast
  let colorSuggestions = $derived.by(() => {
    if (!parsedColor || !contrastInfo) return null;

    const suggestions: {
      forLight: { color: string; ratio: number; rating: ContrastRating } | null;
      forDark: { color: string; ratio: number; rating: ContrastRating } | null;
    } = { forLight: null, forDark: null };

    const oklchColor = culori.oklch(parsedColor);
    if (!oklchColor) return suggestions;

    // If light theme contrast is poor, suggest a darker version
    if (contrastInfo.light.rating === "Fail" || contrastInfo.light.rating === "AA Large") {
      // Decrease lightness to improve contrast on light backgrounds
      for (let l = (oklchColor.l ?? 0.5) - 0.05; l >= 0.1; l -= 0.05) {
        const adjusted = { ...oklchColor, l };
        const ratio = culori.wcagContrast(adjusted, LIGHT_BG);
        if (ratio >= 4.5) {
          suggestions.forLight = {
            color: culori.formatHex(adjusted),
            ratio,
            rating: getContrastRating(ratio),
          };
          break;
        }
      }
    }

    // If dark theme contrast is poor, suggest a lighter version
    if (contrastInfo.dark.rating === "Fail" || contrastInfo.dark.rating === "AA Large") {
      // Increase lightness to improve contrast on dark backgrounds
      for (let l = (oklchColor.l ?? 0.5) + 0.05; l <= 0.95; l += 0.05) {
        const adjusted = { ...oklchColor, l };
        const ratio = culori.wcagContrast(adjusted, DARK_BG);
        if (ratio >= 4.5) {
          suggestions.forDark = {
            color: culori.formatHex(adjusted),
            ratio,
            rating: getContrastRating(ratio),
          };
          break;
        }
      }
    }

    return suggestions;
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
        <div class="flex items-center justify-between">
          <CardTitle>Color Formats</CardTitle>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={roundDecimals}
              class="accent-primary h-4 w-4 rounded"
            />
            <span class="text-muted-foreground">Round decimals</span>
          </label>
        </div>
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

  <!-- Contrast Checker -->
  {#if parsedColor && contrastInfo && colorFormats}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          Contrast Checker
          <Badge variant="outline" class="font-normal">WCAG 2.1</Badge>
        </CardTitle>
        <CardDescription>
          Check how your color contrasts against light and dark backgrounds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-6 md:grid-cols-2">
          <!-- Light Theme Contrast -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Sun class="h-4 w-4 text-amber-500" />
              <span class="font-medium">Light Theme</span>
              <Badge class={getRatingColor(contrastInfo.light.rating)}>
                {contrastInfo.light.rating}
              </Badge>
            </div>
            <div
              class="flex h-24 items-center justify-center rounded-lg border-2 p-4"
              style="background-color: #f8fafc; border-color: #e2e8f0;"
            >
              <span class="text-lg font-semibold" style="color: {colorFormats.hex};">
                Sample Text
              </span>
            </div>
            <div class="text-muted-foreground flex items-center justify-between text-sm">
              <span>Contrast Ratio</span>
              <span class="font-mono font-medium">{contrastInfo.light.ratio.toFixed(2)}:1</span>
            </div>
            {#if colorSuggestions?.forLight}
              <div class="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                <Lightbulb class="h-4 w-4 shrink-0 text-amber-500" />
                <div class="flex-1 space-y-1">
                  <p class="text-sm font-medium">Suggested alternative</p>
                  <div class="flex items-center gap-2">
                    <button
                      class="h-6 w-6 rounded border"
                      style="background-color: {colorSuggestions.forLight.color};"
                      onclick={() => (colorInput = colorSuggestions!.forLight!.color)}
                      title="Click to use this color"
                    ></button>
                    <code class="text-xs">{colorSuggestions.forLight.color}</code>
                    <Badge class={getRatingColor(colorSuggestions.forLight.rating)}>
                      {colorSuggestions.forLight.rating}
                    </Badge>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Dark Theme Contrast -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Moon class="h-4 w-4 text-indigo-400" />
              <span class="font-medium">Dark Theme</span>
              <Badge class={getRatingColor(contrastInfo.dark.rating)}>
                {contrastInfo.dark.rating}
              </Badge>
            </div>
            <div
              class="flex h-24 items-center justify-center rounded-lg border-2 p-4"
              style="background-color: #0f172a; border-color: #1e293b;"
            >
              <span class="text-lg font-semibold" style="color: {colorFormats.hex};">
                Sample Text
              </span>
            </div>
            <div class="text-muted-foreground flex items-center justify-between text-sm">
              <span>Contrast Ratio</span>
              <span class="font-mono font-medium">{contrastInfo.dark.ratio.toFixed(2)}:1</span>
            </div>
            {#if colorSuggestions?.forDark}
              <div class="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                <Lightbulb class="h-4 w-4 shrink-0 text-amber-500" />
                <div class="flex-1 space-y-1">
                  <p class="text-sm font-medium">Suggested alternative</p>
                  <div class="flex items-center gap-2">
                    <button
                      class="h-6 w-6 rounded border"
                      style="background-color: {colorSuggestions.forDark.color};"
                      onclick={() => (colorInput = colorSuggestions!.forDark!.color)}
                      title="Click to use this color"
                    ></button>
                    <code class="text-xs">{colorSuggestions.forDark.color}</code>
                    <Badge class={getRatingColor(colorSuggestions.forDark.rating)}>
                      {colorSuggestions.forDark.rating}
                    </Badge>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Best text color on this background -->
        <Separator class="my-6" />
        <div class="space-y-3">
          <p class="text-sm font-medium">Best text color on this background</p>
          <div class="grid gap-4 md:grid-cols-2">
            <div
              class="flex h-16 items-center justify-center rounded-lg border"
              style="background-color: {colorFormats.hex};"
            >
              <span class="text-lg font-semibold" style="color: white;"> White Text </span>
            </div>
            <div
              class="flex h-16 items-center justify-center rounded-lg border"
              style="background-color: {colorFormats.hex};"
            >
              <span class="text-lg font-semibold" style="color: black;"> Black Text </span>
            </div>
          </div>
          <div class="text-muted-foreground flex justify-between text-sm">
            <span>
              White: <span class="font-mono">{contrastInfo.whiteContrast.toFixed(2)}:1</span>
              <Badge
                class={getRatingColor(getContrastRating(contrastInfo.whiteContrast))}
                variant="outline"
              >
                {getContrastRating(contrastInfo.whiteContrast)}
              </Badge>
            </span>
            <span>
              Black: <span class="font-mono">{contrastInfo.blackContrast.toFixed(2)}:1</span>
              <Badge
                class={getRatingColor(getContrastRating(contrastInfo.blackContrast))}
                variant="outline"
              >
                {getContrastRating(contrastInfo.blackContrast)}
              </Badge>
            </span>
          </div>
          <p class="text-muted-foreground text-sm">
            Recommended: <strong class="text-foreground"
              >{contrastInfo.bestTextOnColor === "white" ? "White" : "Black"}</strong
            > text
          </p>
        </div>
      </CardContent>
    </Card>
  {/if}

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
