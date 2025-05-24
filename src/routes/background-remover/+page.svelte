<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getWorker, initWorker } from '@/tools/backgroundRemoval/index.svelte';
	import { useTable } from 'svelte-tinybase';
	import { db } from '@/db/db.svelte';

	onMount(() => {
		initWorker();
	});

	// onDestroy(async () => {
	// 	await destroyBgRemoveDb();
	// });

	const images = useTable(db, 'images');

	$effect(() => {
		console.log(images);
	});
</script>

<div>
	<h1>Background Remover</h1>
	<p>
		{#if getWorker() != null}
			✅ Worker is initialized
		{:else}
			❌ Worker is not initialized
		{/if}
	</p>
</div>
