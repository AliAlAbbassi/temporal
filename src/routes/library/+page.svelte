<script lang="ts">
	import { getLibrary, getReadChapters, type LibraryEntry } from '$lib/stores/progress';
	import { goto } from '$app/navigation';

	let library = $state<LibraryEntry[]>([]);
	let sortBy = $state<'added' | 'title'>('added');

	$effect(() => {
		library = getLibrary();
	});

	const sorted = $derived(() => {
		const items = [...library];
		if (sortBy === 'title') {
			items.sort((a, b) => a.title.localeCompare(b.title));
		} else {
			items.sort((a, b) => b.addedAt - a.addedAt);
		}
		return items;
	});
</script>

<svelte:head>
	<title>Library — Temporal</title>
</svelte:head>

<div class="flex min-h-dvh flex-col pb-20">
	<header class="sticky top-0 z-30 border-b border-border bg-bg/90 px-4 py-3 pt-safe-top backdrop-blur-xl">
		<div class="mx-auto flex max-w-3xl items-center justify-between">
			<h1 class="text-xl font-bold tracking-tight">Library</h1>
			<div class="flex gap-1.5">
				<button
					onclick={() => (sortBy = 'added')}
					class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {sortBy === 'added'
						? 'bg-accent text-white'
						: 'bg-bg-surface text-text-secondary hover:text-text'}"
				>
					Recent
				</button>
				<button
					onclick={() => (sortBy = 'title')}
					class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {sortBy === 'title'
						? 'bg-accent text-white'
						: 'bg-bg-surface text-text-secondary hover:text-text'}"
				>
					A–Z
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 px-4 py-4">
		<div class="mx-auto max-w-3xl">
			{#if library.length === 0}
				<div class="flex flex-col items-center justify-center py-32 text-center">
					<svg class="mb-4 h-12 w-12 text-text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
					</svg>
					<p class="text-text-secondary">Your library is empty</p>
					<p class="mt-1 text-xs text-text-muted">Bookmark manga from the detail page</p>
				</div>
			{:else}
				<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
					{#each sorted() as item (item.mangaId)}
						<button
							onclick={() => goto(`/manga/${item.mangaId}`)}
							class="group text-left"
						>
							<div class="relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-surface">
								{#if item.coverUrl}
									<img
										src={item.coverUrl}
										alt={item.title}
										class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
										loading="lazy"
										decoding="async"
									/>
								{/if}
								{#if item.mangaId.startsWith('mangapill:')}
									<span class="absolute left-1 top-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">MP</span>
								{/if}
							</div>
							<p class="mt-1.5 line-clamp-2 text-xs leading-tight text-text-secondary">{item.title}</p>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.pt-safe-top {
		padding-top: max(0.75rem, env(safe-area-inset-top));
	}
</style>
