<script lang="ts">
  import { onMount } from "svelte";
  import {
    getSelectedModel,
    initWorker,
    processImage,
    setSelectedModel,
  } from "@/tools/backgroundRemoval/index.svelte";
  import Library from "@/components/Library.svelte";
  import ImageDropzone from "@/components/ImageDropzone.svelte";
  import { Select, SelectItem, SelectTrigger } from "@/components/ui/select";
  import { BG_REMOVAL_MODELS, type BGRemovalModel } from "@/tools/backgroundRemoval/types";
  import SelectContent from "@/components/ui/select/select-content.svelte";
  import SvelteSeo from "svelte-seo";
  onMount(() => {
    initWorker();
  });

  function handleFile(file: File[]) {
    file.forEach((f) => processImage(f));
  }
</script>

<SvelteSeo
  title="Background Remover | Pol Tools"
  description="Remove the background of an image using various AI models locally in your browser."
/>

<div class="container mx-auto max-w-6xl space-y-8 pb-6">
  <div class="space-y-2 text-center">
    <h1 class="text-3xl font-bold">Background Remover</h1>
    <p class="text-muted-foreground">
      Remove the background of an image using various AI models locally in your browser.
    </p>
  </div>

  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div class="md:col-span-1">
      <h2 class="mb-2 text-lg font-semibold">Select Model</h2>
      <Select
        type="single"
        value={getSelectedModel()}
        onValueChange={(value) => setSelectedModel(value as BGRemovalModel)}
      >
        <SelectTrigger>
          <p>Selected model: {getSelectedModel()}</p>
        </SelectTrigger>
        <SelectContent>
          {#each BG_REMOVAL_MODELS as model}
            <SelectItem value={model}>{model}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    <div class="md:col-span-2">
      <ImageDropzone onFiles={handleFile} />
    </div>
  </div>
</div>

<Library />
