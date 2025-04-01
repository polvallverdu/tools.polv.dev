<script lang="ts">
	import { type BGRemovalModel, BG_REMOVAL_MODELS, RMBG_2_0 } from '$lib/tools/backgroundRemoval';
	import { onMount } from 'svelte';
	import { onDestroy } from 'svelte';

	// Model selection state
	let selectedModel = $state<BGRemovalModel>(RMBG_2_0);

	// File upload and processing state
	let dragActive = $state(false);
	let processing = $state(false);
	let images = $state<
		{
			id: string;
			original: string;
			processed?: string;
			status: 'pending' | 'processing' | 'completed' | 'error';
			error?: string;
			timestamp: number;
		}[]
	>([]);

	// Storage keys
	const STORAGE_KEY_MODEL = 'bg-remover-selected-model';
	const STORAGE_KEY_IMAGES = 'bg-remover-images';

	// Web Worker reference
	let worker: Worker | null = null;

	// Initialize state from local storage and set up worker
	onMount(() => {
		// Load preferred model from localStorage
		const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
		if (savedModel && BG_REMOVAL_MODELS.includes(savedModel as BGRemovalModel)) {
			selectedModel = savedModel as BGRemovalModel;
		}

		// Load saved images from localStorage
		const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
		if (savedImages) {
			try {
				images = JSON.parse(savedImages);
			} catch (error) {
				console.error('Failed to parse saved images', error);
			}
		}

		// Initialize web worker
		try {
			// Create worker with proper URL format for Vite
			if (typeof Worker !== 'undefined') {
				// In a real implementation, we would use the @xenova/transformers package
				// For now, use a simple worker that simulates background removal
				const workerBlobURL = URL.createObjectURL(
					new Blob(
						[`importScripts('${window.location.origin}/src/lib/tools/bgRemovalWorker.js');`],
						{ type: 'application/javascript' }
					)
				);
				worker = new Worker(workerBlobURL, { type: 'module' });

				// Set up message handling from worker
				worker.onmessage = (event) => {
					const { id, status, result, error } = event.data;

					// Update the corresponding image with the result
					images = images.map((img) =>
						img.id === id
							? {
									...img,
									status: status,
									processed: result,
									error: error
								}
							: img
					);
				};

				// Process any pending images
				const pendingImages = images.filter((img) => img.status === 'pending');
				if (pendingImages.length > 0) {
					pendingImages.forEach((img) => sendImageToWorker(img));
				}
			} else {
				console.error('Web workers are not supported in this browser');
			}
		} catch (error) {
			console.error('Failed to initialize web worker:', error);
		}
	});

	// Clean up worker on component unmount
	onDestroy(() => {
		if (worker) {
			worker.terminate();
		}
	});

	// Update localStorage when model selection changes
	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY_MODEL, selectedModel);
		}
	});

	// Update localStorage when images change
	$effect(() => {
		if (typeof localStorage !== 'undefined' && images.length > 0) {
			localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
		}
	});

	// Handle file drops
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;

		if (e.dataTransfer?.files) {
			handleFiles(e.dataTransfer.files);
		}
	}

	// Handle file input changes
	function handleFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			handleFiles(input.files);
		}
	}

	// Process uploaded files
	function handleFiles(files: FileList) {
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onload = (e) => {
					const id = crypto.randomUUID();
					const imageData = {
						id,
						original: e.target?.result as string,
						status: 'pending' as const,
						timestamp: Date.now()
					};
					images = [...images, imageData];
					sendImageToWorker(imageData);
				};
				reader.readAsDataURL(file);
			}
		}
	}

	// Send image to web worker for processing
	function sendImageToWorker(imageData: (typeof images)[0]) {
		if (!worker) {
			console.error('Web worker not available');
			return;
		}

		// Update status to processing
		images = images.map((img) =>
			img.id === imageData.id ? { ...img, status: 'processing' as const } : img
		);

		// Send to worker
		worker.postMessage({
			id: imageData.id,
			modelName: selectedModel,
			imageData: imageData.original
		});
	}

	// Delete an image from storage
	function deleteImage(id: string) {
		images = images.filter((img) => img.id !== id);
	}

	// Download the processed image
	function downloadImage(image: (typeof images)[0]) {
		if (!image.processed) return;

		const link = document.createElement('a');
		link.href = image.processed;
		link.download = `bg-removed-${image.id}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<div class="container mx-auto max-w-4xl p-4">
	<h1 class="mb-6 text-2xl font-bold">Background Remover</h1>

	<div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<p class="text-sm text-blue-800">
			<strong>Note:</strong> For a complete implementation, you need to install the
			@xenova/transformers package:
			<code class="rounded bg-blue-100 px-2 py-1">npm install @xenova/transformers</code>
		</p>
	</div>

	<!-- Model selector -->
	<div class="mb-6">
		<label for="model-select" class="mb-2 block text-sm font-medium">
			Background Removal Model
		</label>
		<select
			id="model-select"
			bind:value={selectedModel}
			class="w-full rounded-md border bg-white p-2"
		>
			{#each BG_REMOVAL_MODELS as model}
				<option value={model}>{model}</option>
			{/each}
		</select>
	</div>

	<!-- Upload dropzone -->
	<div
		class="mb-8 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
		class:border-blue-400={dragActive}
		class:bg-blue-50={dragActive}
		class:border-gray-300={!dragActive}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
		on:click={() => document.getElementById('file-input')?.click()}
	>
		<input
			type="file"
			id="file-input"
			accept="image/*"
			multiple
			class="hidden"
			on:change={handleFileInputChange}
		/>
		<div class="text-gray-500">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mx-auto mb-2 h-12 w-12"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"
				/>
			</svg>
			<p class="text-lg font-medium">Drop images here or click to upload</p>
			<p class="mt-1 text-sm">Supported formats: JPG, PNG, WEBP</p>
		</div>
	</div>

	<!-- Image gallery -->
	{#if images.length > 0}
		<h2 class="mb-4 text-xl font-semibold">Your Images</h2>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each images.sort((a, b) => b.timestamp - a.timestamp) as image (image.id)}
				<div class="overflow-hidden rounded-lg border shadow-sm">
					<div class="relative aspect-video bg-gray-100">
						{#if image.status === 'completed' && image.processed}
							<img src={image.processed} alt="Processed" class="h-full w-full object-contain p-2" />
						{:else}
							<img src={image.original} alt="Original" class="h-full w-full object-contain p-2" />
						{/if}

						{#if image.status === 'processing'}
							<div
								class="bg-opacity-50 absolute inset-0 flex items-center justify-center bg-black text-white"
							>
								<div class="text-center">
									<svg
										class="mx-auto mb-2 h-8 w-8 animate-spin"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									<p>Processing...</p>
								</div>
							</div>
						{:else if image.status === 'error'}
							<div
								class="bg-opacity-50 absolute inset-0 flex items-center justify-center bg-red-500 text-white"
							>
								<div class="p-4 text-center">
									<p class="font-bold">Error</p>
									<p class="text-sm">{image.error || 'Failed to process image'}</p>
								</div>
							</div>
						{:else if image.status === 'completed' && image.processed}
							<div class="absolute top-0 right-0 p-2">
								<button
									class="rounded-md bg-green-500 px-3 py-1 text-sm text-white"
									on:click={() => downloadImage(image)}
								>
									Download
								</button>
							</div>
						{/if}
					</div>

					<div class="flex items-center justify-between bg-gray-50 p-3">
						<div>
							<span class="text-sm font-medium">
								{#if image.status === 'pending'}
									Waiting...
								{:else if image.status === 'processing'}
									Processing...
								{:else if image.status === 'completed'}
									Completed
								{:else}
									Failed
								{/if}
							</span>
						</div>
						<button class="text-red-500 hover:text-red-700" on:click={() => deleteImage(image.id)}>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="py-8 text-center text-gray-500">
			<p>No images yet. Upload an image to get started.</p>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background-color: #f9fafb;
	}
</style>
