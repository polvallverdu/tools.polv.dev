<script lang="ts">
  let isDragging = $state(false);

  interface Props {
    onFiles: (files: File[]) => void;
  }

  const { onFiles }: Props = $props();

  let fileInputNode: HTMLInputElement | undefined;

  function handleFilesSelected(files: File[]) {
    onFiles(files);
  }

  function handleFileSelectEvent(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const filesArray = Array.from(target.files);
      handleFilesSelected(filesArray);
      // Reset the input value to allow uploading the same file again
      target.value = "";
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const filesArray = Array.from(event.dataTransfer.files);
      handleFilesSelected(filesArray);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!isDragging) isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }
</script>

<div
  class="dropzone"
  class:dragging={isDragging}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={() => fileInputNode?.click()}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputNode?.click();
    }
  }}
  role="button"
  tabindex="0"
  aria-label="Image drop zone"
>
  <input
    bind:this={fileInputNode}
    type="file"
    accept="image/*"
    multiple
    onchange={handleFileSelectEvent}
    style="display: none;"
  />
  <p>
    {#if isDragging}
      Drop the images here!
    {:else}
      Drag & drop images here, or click to select multiple
    {/if}
  </p>
</div>

<style>
  .dropzone {
    border: 2px dashed #ccc;
    border-radius: 10px;
    padding: 50px;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.3s,
      background-color 0.3s;
    margin-top: 20px;
    background-color: #f9f9f9;
  }

  .dropzone p {
    margin: 0;
    font-size: 1.2em;
    color: #555;
  }

  .dropzone.dragging {
    border-color: #007bff;
    background-color: #e9f5ff;
  }

  .dropzone:hover {
    border-color: #aaa;
  }
</style>
