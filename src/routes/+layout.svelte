<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import '../app.css';
	import { Button } from '$lib/components/ui/button';
	import { Loader2Icon, Menu, XIcon } from '@lucide/svelte';
	import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
	import SheetClose from '@/components/ui/sheet/sheet-close.svelte';
	import type { Snippet } from 'svelte';
	import { isDbInitialized } from '@/db/db.svelte';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();
	let sheetOpen = $state(false);
</script>

<div class="flex h-screen">
	<!-- Sidebar for larger screens -->
	<div class="hidden md:block">
		<Sidebar />
	</div>

	<!-- Mobile menu button and Sheet -->
	<div class="fixed top-4 left-4 z-20 md:hidden">
		<Sheet bind:open={sheetOpen}>
			<SheetTrigger>
				<Button variant="outline" size="icon">
					<Menu class="h-6 w-6" />
					<span class="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" class="p-0" showX={false}>
				<SheetClose class="absolute top-4 right-4">
					<XIcon class="size-4" />
					<span class="sr-only">Close</span>
				</SheetClose>
				<Sidebar class="w-full" onClick={() => (sheetOpen = false)} />
			</SheetContent>
		</Sheet>
	</div>

	<main class="flex-1 p-8 pt-16 md:pt-8">
		{#if isDbInitialized()}
			{@render children()}
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<Loader2Icon class="size-10 animate-spin" />
			</div>
		{/if}
	</main>
</div>
