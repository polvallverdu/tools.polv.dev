<script lang="ts">
  import { useTable } from "svelte-tinybase";
  import { db } from "@/db/db.svelte";
  import { getProcessingImages } from "@/tools/processingImages.svelte";
  import { blobToBase64 } from "@/utils/blob";
  import ImageCard from "./ImageCard.svelte";

  const images = useTable(db, "images");
  let page = $state(1);
  let pageSize = $state(20);

  const paginatedImages = $derived(
    Object.entries(images.value)
      .sort(
        (a, b) =>
          new Date(b[1]?.createdAt || "").getTime() - new Date(a[1]?.createdAt || "").getTime(),
      )
      .slice((page - 1) * pageSize, page * pageSize),
  );

  // Convert processing images to a format compatible with ImageCard
  const processingImageCards = $derived.by(async () => {
    const processingImages = getProcessingImages();
    const cards = await Promise.all(
      processingImages.map(async (image) => {
        const inputBase64 = await blobToBase64(image.input);
        return {
          id: image.id,
          name: image.name,
          input: inputBase64,
          output: undefined,
          status: image.status,
        };
      }),
    );
    return cards;
  });
</script>

<div class="mx-auto max-w-7xl px-6 py-8">
  <div class="mb-8 text-center">
    <h2 class="mb-2 text-3xl font-bold tracking-tight">Your Images</h2>
    <p class="text-muted-foreground">
      {Object.keys(images.value).length} processed • {getProcessingImages().length} processing
    </p>
  </div>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <!-- Processing Images -->
    {#await processingImageCards then cards}
      {#each cards as image (image.id)}
        <ImageCard
          id={image.id}
          name={image.name}
          input={image.input}
          output={image.output}
          status={image.status}
        />
      {/each}
    {/await}

    <!-- Completed Images -->
    {#each paginatedImages as [id, image] (id)}
      <ImageCard
        {id}
        name={image.name || "Untitled"}
        input={image.input || ""}
        output={image.output}
        status="done"
      />
    {/each}
  </div>

  {#if Object.keys(images.value).length > pageSize}
    <div class="mt-8 flex items-center justify-center gap-4">
      <button
        class="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
        onclick={() => (page = Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Previous
      </button>

      <span class="text-muted-foreground text-sm font-medium">
        Page {page} of {Math.ceil(Object.keys(images.value).length / pageSize)}
      </span>

      <button
        class="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
        onclick={() =>
          (page = Math.min(Math.ceil(Object.keys(images.value).length / pageSize), page + 1))}
        disabled={page === Math.ceil(Object.keys(images.value).length / pageSize)}
      >
        Next
      </button>
    </div>
  {/if}

  {#if Object.keys(images.value).length === 0 && getProcessingImages().length === 0}
    <div
      class="border-muted-foreground/25 bg-muted/50 flex min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed"
    >
      <div class="text-center">
        <h3 class="text-muted-foreground mb-2 text-2xl font-semibold">No images yet</h3>
        <p class="text-muted-foreground">
          Upload some images to get started with background removal!
        </p>
      </div>
    </div>
  {/if}
</div>
