<script lang="ts">
	import MangaGrid from '$lib/components/MangaGrid.svelte';

	type SortOption = 'followedCount' | 'rating' | 'latest';

	let sort = $state<SortOption>('followedCount');
	let results = $state<any[]>([]);
	let loading = $state(true);
	let offset = $state(0);
	let total = $state(0);
	let loadingMore = $state(false);

	async function fetchPopular(sortBy: SortOption, page = 0) {
		const limit = 20;
		const res = await fetch(`/api/manga/popular?sort=${sortBy}&limit=${limit}&offset=${page}`);
		const data = await res.json();
		return data;
	}

	$effect(() => {
		loading = true;
		results = [];
		offset = 0;
		fetchPopular(sort).then((data) => {
			results = data.results;
			total = data.total;
			offset = data.results.length;
			loading = false;
		});
	});

	async function loadMore() {
		if (loadingMore || offset >= total) return;
		loadingMore = true;
		const data = await fetchPopular(sort, offset);
		results = [...results, ...data.results];
		offset += data.results.length;
		loadingMore = false;
	}

	const sortOptions: { value: SortOption; label: string }[] = [
		{ value: 'followedCount', label: 'Most Popular' },
		{ value: 'rating', label: 'Top Rated' },
		{ value: 'latest', label: 'Recently Updated' },
	];
</script>

<svelte:head>
	<title>Discover — Temporal</title>
</svelte:head>

<div class="flex min-h-dvh flex-col pb-20">
	<header class="sticky top-0 z-30 border-b border-border bg-bg/90 px-4 py-3 pt-safe-top backdrop-blur-xl">
		<div class="mx-auto max-w-3xl">
			<h1 class="mb-3 text-xl font-bold tracking-tight">Discover</h1>
			<div class="flex gap-1.5">
				{#each sortOptions as opt}
					<button
						onclick={() => (sort = opt.value)}
						class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {sort === opt.value
							? 'bg-accent text-white'
							: 'bg-bg-surface text-text-secondary hover:text-text'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>
	</header>

	<main class="flex-1 px-4 py-4">
		<div class="mx-auto max-w-3xl">
			{#if loading}
				<div class="flex items-center justify-center py-20">
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
				</div>
			{:else if results.length === 0}
				<p class="py-20 text-center text-text-secondary">No manga found</p>
			{:else}
				<MangaGrid items={results.map((r) => ({ id: r.id, title: r.title, coverUrl: r.coverUrl }))} />

				{#if offset < total}
					<div class="mt-6 flex justify-center">
						<button
							onclick={loadMore}
							disabled={loadingMore}
							class="rounded-xl bg-bg-surface px-6 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-50"
						>
							{#if loadingMore}
								Loading...
							{:else}
								Load More
							{/if}
						</button>
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
