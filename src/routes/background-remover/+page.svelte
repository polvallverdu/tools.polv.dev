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

  onMount(() => {
    initWorker();
  });

  function handleFile(file: File[]) {
    file.forEach((f) => processImage(f));
  }
</script>

<div>
  <h1>Background Remover</h1>
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

  <ImageDropzone onFiles={handleFile} />
</div>

<Library />
