<script lang="ts">
  import { Download, Trash2, Loader2Icon } from "@lucide/svelte";
  import { base64ToBlob } from "@/utils/blob";
  import { db } from "@/db/db.svelte";
  import { cn } from "@/utils";
  import { Button } from "./ui/button";

  interface Props {
    id: string;
    name: string;
    input: string; // base64 string
    output?: string; // base64 string, optional
    status?: "processing" | "done" | "error"; // optional status for processing
  }

  const { id, name, input, output, status = "done" }: Props = $props();

  let isHovering = $state(false);

  const showSpinner = $derived(status === "processing");
  const showError = $derived(status === "error");

  function downloadImage(imageData: string, filename: string) {
    const blob = base64ToBlob(imageData, "image/png");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadInput() {
    downloadImage(input, `${name}_original.png`);
  }

  function downloadOutput() {
    if (output) {
      downloadImage(output, `${name}_processed.png`);
    }
  }

  function deleteImage() {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      db.delRow("images", id);
    }
  }
</script>

<div
  class="group bg-card relative w-full max-w-sm overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
>
  <div class="bg-muted relative aspect-square">
    <!-- Transparent background pattern for images with transparency -->
    <div
      class="absolute inset-0 opacity-50"
      style="background-image: 
        linear-gradient(45deg, #e5e5e5 25%, transparent 25%), 
        linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #e5e5e5 75%), 
        linear-gradient(-45deg, transparent 75%, #e5e5e5 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
    ></div>

    <div
      class="relative h-full w-full cursor-pointer"
      onmouseenter={() => (isHovering = true)}
      onmouseleave={() => (isHovering = false)}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          isHovering = !isHovering;
        }
      }}
    >
      {#if showSpinner}
        <div
          class="bg-background/90 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <Loader2Icon class="text-primary h-8 w-8 animate-spin" />
          <span class="text-muted-foreground mt-2 text-sm font-medium">Processing...</span>
        </div>
      {/if}

      {#if showError}
        <div
          class="bg-background/90 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <span class="text-destructive text-sm font-medium">Error processing image</span>
        </div>
      {/if}

      {#if output}
        <!-- Two images for smooth switching - show input on hover, output by default -->
        <img
          src={`data:image/png;base64,${input}`}
          alt={`${name} - original`}
          class={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-200",
            showSpinner && "opacity-50",
            showError && "opacity-30 grayscale",
            isHovering ? "opacity-100" : "opacity-0",
          )}
        />
        <img
          src={`data:image/png;base64,${output}`}
          alt={`${name} - processed`}
          class={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-200",
            showSpinner && "opacity-50",
            showError && "opacity-30 grayscale",
            isHovering ? "opacity-0" : "opacity-100",
          )}
        />
      {:else}
        <!-- No output, just show input -->
        <img
          src={`data:image/png;base64,${input}`}
          alt={name}
          class={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-200",
            showSpinner && "opacity-50",
            showError && "opacity-30 grayscale",
          )}
        />
      {/if}

      {#if output && !showSpinner && !showError}
        <div
          class={cn(
            "absolute right-2 bottom-2 left-2 z-20 rounded bg-black/70 px-2 py-1 text-center text-xs text-white opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100",
          )}
        >
          {isHovering ? "Original" : "Hover to see original"}
        </div>
      {/if}
    </div>
  </div>

  <div class="p-4">
    <h3 class="mb-3 truncate text-base font-semibold" title={name}>{name}</h3>

    <div class="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={downloadInput}
        disabled={showSpinner}
        class="h-8 gap-1.5 text-xs"
      >
        <Download class="h-3 w-3" />
        Original
      </Button>

      {#if output}
        <Button
          variant="outline"
          size="sm"
          onclick={downloadOutput}
          disabled={showSpinner}
          class="h-8 gap-1.5 text-xs"
        >
          <Download class="h-3 w-3" />
          Processed
        </Button>
      {/if}

      <Button
        variant="outline"
        size="sm"
        onclick={deleteImage}
        disabled={showSpinner}
        class="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 gap-1.5 text-xs"
      >
        <Trash2 class="h-3 w-3" />
      </Button>
    </div>
  </div>
</div>
