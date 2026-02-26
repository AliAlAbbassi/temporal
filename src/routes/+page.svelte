<script lang="ts">
	import { goto } from '$app/navigation';
	import { getAllProgress, getLibrary, type LibraryEntry, type ReadingProgress } from '$lib/stores/progress';
	import MangaGrid from '$lib/components/MangaGrid.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';

	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let continueReading = $state<ReadingProgress[]>([]);
	let library = $state<LibraryEntry[]>([]);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let sourceFilter = $state<'all' | 'mangadex' | 'mangapill'>('all');

	$effect(() => {
		continueReading = getAllProgress();
		library = getLibrary();
	});

	async function doSearch(query: string, source: string) {
		if (!query.trim()) {
			searchResults = [];
			isSearching = false;
			return;
		}

		isSearching = true;
		try {
			const sourceParam = source !== 'all' ? `&source=${source}` : '';
			const res = await fetch(`/api/manga/search?q=${encodeURIComponent(query)}${sourceParam}`);
			const data = await res.json();
			searchResults = data.results;
		} catch {
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	async function onSearch(query: string) {
		searchQuery = query;
		clearTimeout(searchTimeout);

		if (!query.trim()) {
			searchResults = [];
			isSearching = false;
			return;
		}

		isSearching = true;
		searchTimeout = setTimeout(() => doSearch(query, sourceFilter), 300);
	}

	function setSource(source: 'all' | 'mangadex' | 'mangapill') {
		sourceFilter = source;
		if (searchQuery.trim()) {
			doSearch(searchQuery, source);
		}
	}
</script>

<div class="flex min-h-dvh flex-col">
	<!-- Header -->
	<header class="sticky top-0 z-30 border-b border-border bg-bg/90 px-4 pb-3 pt-safe-top backdrop-blur-xl">
		<div class="mx-auto max-w-3xl">
			<h1 class="mb-3 text-xl font-bold tracking-tight">Temporal</h1>
			<SearchBar value={searchQuery} oninput={onSearch} />
		</div>
	</header>

	<main class="flex-1 px-4 py-4">
		<div class="mx-auto max-w-3xl">
			{#if searchQuery.trim()}
				<!-- Source filter tabs -->
				<div class="mb-4 flex gap-1.5">
					{#each [['all', 'All'], ['mangadex', 'MangaDex'], ['mangapill', 'MangaPill']] as [value, label]}
						<button
							onclick={() => setSource(value as any)}
							class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {sourceFilter === value ? 'bg-accent text-white' : 'bg-bg-surface text-text-secondary hover:text-text'}"
						>
							{label}
						</button>
					{/each}
				</div>

				<!-- Search results -->
				<section>
					{#if isSearching}
						<div class="flex items-center justify-center py-20">
							<div class="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
						</div>
					{:else if searchResults.length === 0}
						<p class="py-20 text-center text-text-secondary">No results found</p>
					{:else}
						<MangaGrid items={searchResults.map(r => ({ id: r.id, title: r.title, coverUrl: r.coverUrl }))} />
					{/if}
				</section>
			{:else}
				<!-- Continue Reading -->
				{#if continueReading.length > 0}
					<section class="mb-8">
						<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Continue Reading</h2>
						<div class="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							{#each continueReading.slice(0, 10) as progress}
								<button
									onclick={() => goto(`/read/${progress.chapterId}`)}
									class="group flex-shrink-0"
								>
									<div class="relative h-36 w-24 overflow-hidden rounded-lg bg-bg-surface">
										{#if progress.coverUrl}
											<img
												src={progress.coverUrl}
												alt={progress.mangaTitle}
												class="h-full w-full object-cover transition-transform group-hover:scale-105"
												loading="lazy"
												decoding="async"
											/>
										{/if}
										<!-- Progress bar -->
										<div class="absolute inset-x-0 bottom-0 h-1 bg-bg/60">
											<div
												class="h-full bg-accent"
												style="width: {Math.round((progress.page / Math.max(progress.totalPages, 1)) * 100)}%"
											></div>
										</div>
									</div>
									<p class="mt-1.5 w-24 truncate text-xs text-text-secondary">{progress.mangaTitle}</p>
									<p class="w-24 truncate text-[10px] text-text-muted">Ch. {progress.chapterNumber || '?'}</p>
								</button>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Library -->
				{#if library.length > 0}
					<section class="mb-8">
						<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Library</h2>
						<MangaGrid items={library.map(e => ({ id: e.mangaId, title: e.title, coverUrl: e.coverUrl }))} />
					</section>
				{/if}

				<!-- Empty state -->
				{#if continueReading.length === 0 && library.length === 0}
					<div class="flex flex-col items-center justify-center py-32 text-center">
						<div class="mb-4 text-5xl opacity-20">&#x1F4DA;</div>
						<p class="text-text-secondary">Search for manga to get started</p>
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>

<style>
	.pt-safe-top {
		padding-top: max(0.75rem, env(safe-area-inset-top));
	}
</style>
