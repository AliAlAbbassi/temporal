<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import {
		getProgress,
		getReadChapters,
		markChapterRead,
		isInLibrary,
		addToLibrary,
		removeFromLibrary,
	} from '$lib/stores/progress';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const manga = $derived(data.manga);

	let inLibrary = $state(false);
	let readChapters = $state<Set<string>>(new Set());
	let progress = $state<ReturnType<typeof getProgress>>(null);
	let showFullDesc = $state(false);
	let sortDesc = $state(true);
	let chapterSearch = $state('');
	let showChapterMenu = $state(false);

	$effect(() => {
		inLibrary = isInLibrary(manga.id);
		readChapters = getReadChapters(manga.id);
		progress = getProgress(manga.id);
	});

	const filteredChapters = $derived(() => {
		let chapters = [...manga.chapters];
		if (sortDesc) chapters.reverse();

		if (chapterSearch.trim()) {
			const q = chapterSearch.trim().toLowerCase();
			chapters = chapters.filter(
				(ch) =>
					ch.chapter?.toLowerCase().includes(q) ||
					ch.title?.toLowerCase().includes(q),
			);
		}
		return chapters;
	});

	const readCount = $derived(manga.chapters.filter((ch) => readChapters.has(ch.id)).length);

	function toggleLibrary() {
		if (inLibrary) {
			removeFromLibrary(manga.id);
		} else {
			addToLibrary({ mangaId: manga.id, title: manga.title, coverUrl: manga.coverUrl });
		}
		inLibrary = !inLibrary;
	}

	function continueReading() {
		if (progress) {
			goto(`/read/${progress.chapterId}?manga=${manga.id}`);
			return;
		}
		const firstReadable = manga.chapters.find((ch) => ch.pages > 0) || manga.chapters[0];
		if (!firstReadable) return;

		if (firstReadable.pages === 0 && firstReadable.externalUrl) {
			window.open(firstReadable.externalUrl, '_blank');
		} else {
			goto(`/read/${firstReadable.id}?manga=${manga.id}`);
		}
	}

	function markAllRead() {
		if (!browser) return;
		const all = JSON.parse(localStorage.getItem('manga_read_chapters') || '{}');
		all[manga.id] = manga.chapters.map((ch) => ch.id);
		localStorage.setItem('manga_read_chapters', JSON.stringify(all));
		readChapters = new Set(all[manga.id]);
		showChapterMenu = false;
	}

	function markAllUnread() {
		if (!browser) return;
		const all = JSON.parse(localStorage.getItem('manga_read_chapters') || '{}');
		delete all[manga.id];
		localStorage.setItem('manga_read_chapters', JSON.stringify(all));
		readChapters = new Set();
		showChapterMenu = false;
	}

	let scrolled = $state(false);

	$effect(() => {
		const root = document.getElementById('app-root');
		if (!root) return;
		const onScroll = () => {
			scrolled = root.scrollTop > 20;
		};
		root.addEventListener('scroll', onScroll, { passive: true });
		return () => root.removeEventListener('scroll', onScroll);
	});

	// Close menu on outside click
	function handleMenuClick(e: MouseEvent) {
		if (!(e.target as HTMLElement).closest('[data-chapter-menu]')) {
			showChapterMenu = false;
		}
	}
</script>

<svelte:window onclick={handleMenuClick} />

<svelte:head>
	<title>{manga.title} — Temporal</title>
</svelte:head>

<div class="min-h-dvh pb-20">
	<!-- Floating back button -->
	<button
		onclick={() => history.back()}
		class="fixed left-3 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white pt-safe-top-btn"
		class:opacity-0={scrolled}
		class:pointer-events-none={scrolled}
		aria-label="Go back"
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="m15 18-6-6 6-6" />
		</svg>
	</button>

	<!-- Hero -->
	<div class="relative">
		{#if manga.coverUrl}
			<div class="absolute inset-0 overflow-hidden">
				<img
					src={manga.coverUrl}
					alt=""
					class="h-full w-full object-cover opacity-30 blur-2xl"
					decoding="async"
				/>
				<div class="absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/80 to-bg"></div>
			</div>
		{/if}

		<div class="relative px-4 pb-4 pt-safe-top">
			<div class="mx-auto flex max-w-3xl gap-4">
				<!-- Cover -->
				<div class="w-28 flex-shrink-0 sm:w-36">
					<div class="aspect-[2/3] overflow-hidden rounded-xl bg-bg-surface shadow-2xl">
						{#if manga.coverUrl}
							<img src={manga.coverUrl} alt={manga.title} class="h-full w-full object-cover" decoding="async" />
						{/if}
					</div>
				</div>

				<!-- Info -->
				<div class="flex min-w-0 flex-1 flex-col justify-end">
					<h1 class="text-lg font-bold leading-tight sm:text-xl">{manga.title}</h1>
					{#if manga.author}
						<p class="mt-1 text-sm text-text-secondary">{manga.author}</p>
					{/if}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#if manga.id.startsWith('mangapill:')}
							<span class="rounded-md bg-emerald-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
								MangaPill
							</span>
						{:else}
							<span class="rounded-md bg-orange-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
								MangaDex
							</span>
						{/if}
						<span class="rounded-md bg-bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
							{manga.status}
						</span>
						{#if manga.year}
							<span class="rounded-md bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary">
								{manga.year}
							</span>
						{/if}
					</div>
					<p class="mt-2 text-xs text-text-muted">
						{manga.chapters.length} chapters
						{#if readCount > 0}
							&middot; {readCount} read
						{/if}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="mx-auto max-w-3xl px-4 py-3">
		<div class="flex gap-2">
			<button
				onclick={continueReading}
				class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
			>
				{#if progress}
					Continue Ch. {progress.chapterNumber || '?'}
				{:else}
					Start Reading
				{/if}
			</button>
			<button
				onclick={toggleLibrary}
				class="flex items-center justify-center rounded-xl px-4 ring-1 transition-colors {inLibrary ? 'bg-accent/10 text-accent ring-accent/30' : 'text-text-secondary ring-border hover:text-text'}"
				aria-label={inLibrary ? 'Remove from library' : 'Add to library'}
			>
				{#if inLibrary}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
					</svg>
				{:else}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Description -->
	{#if manga.description}
		<div class="mx-auto max-w-3xl px-4 py-2">
			<button onclick={() => (showFullDesc = !showFullDesc)} class="w-full text-left">
				<p class="text-sm leading-relaxed text-text-secondary {showFullDesc ? '' : 'line-clamp-3'}">
					{manga.description}
				</p>
				<span class="mt-1 text-xs text-text-muted">{showFullDesc ? 'Show less' : 'Show more'}</span>
			</button>
		</div>
	{/if}

	<!-- Tags -->
	{#if manga.tags.length > 0}
		<div class="mx-auto max-w-3xl px-4 py-2">
			<div class="flex flex-wrap gap-1.5">
				{#each manga.tags.slice(0, 12) as tag}
					<span class="rounded-md bg-bg-surface px-2 py-1 text-[10px] text-text-muted">{tag}</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Chapters -->
	<div class="mx-auto max-w-3xl px-4 pt-4">
		<!-- Chapter header with controls -->
		<div class="mb-3 flex items-center gap-2">
			<h2 class="text-sm font-semibold uppercase tracking-wider text-text-secondary">Chapters</h2>
			<span class="text-xs text-text-muted">({filteredChapters().length})</span>
			<div class="flex-1"></div>

			<!-- Sort toggle -->
			<button
				onclick={() => (sortDesc = !sortDesc)}
				class="flex items-center gap-1 rounded-lg bg-bg-surface px-2 py-1 text-[10px] text-text-muted transition-colors hover:text-text"
				aria-label="Toggle sort order"
			>
				<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					{#if sortDesc}
						<path d="M12 5v14M5 12l7 7 7-7" />
					{:else}
						<path d="M12 19V5M5 12l7-7 7 7" />
					{/if}
				</svg>
				{sortDesc ? 'Newest' : 'Oldest'}
			</button>

			<!-- More menu -->
			<div class="relative" data-chapter-menu>
				<button
					onclick={(e) => { e.stopPropagation(); showChapterMenu = !showChapterMenu; }}
					class="flex items-center rounded-lg bg-bg-surface p-1 text-text-muted transition-colors hover:text-text"
					aria-label="Chapter options"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
						<circle cx="12" cy="5" r="1.5" />
						<circle cx="12" cy="12" r="1.5" />
						<circle cx="12" cy="19" r="1.5" />
					</svg>
				</button>
				{#if showChapterMenu}
					<div class="absolute right-0 top-8 z-50 w-44 rounded-xl bg-bg-elevated p-1 shadow-xl ring-1 ring-border">
						<button
							onclick={markAllRead}
							class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M20 6 9 17l-5-5" />
							</svg>
							Mark all as read
						</button>
						<button
							onclick={markAllUnread}
							class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
							</svg>
							Mark all as unread
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Chapter search (show for long chapter lists) -->
		{#if manga.chapters.length > 20}
			<div class="mb-3">
				<input
					type="text"
					bind:value={chapterSearch}
					placeholder="Search chapters..."
					class="w-full rounded-lg bg-bg-surface px-3 py-2 text-xs text-text outline-none ring-1 ring-border placeholder:text-text-muted focus:ring-accent/50"
				/>
			</div>
		{/if}

		<!-- Chapter list -->
		<div class="flex flex-col">
			{#each filteredChapters() as chapter (chapter.id)}
				{@const isRead = readChapters.has(chapter.id)}
				{@const isExternal = chapter.pages === 0 && chapter.externalUrl}
				<a
					href={isExternal ? chapter.externalUrl : `/read/${chapter.id}?manga=${manga.id}`}
					target={isExternal ? '_blank' : undefined}
					rel={isExternal ? 'noopener noreferrer' : undefined}
					class="flex items-center gap-3 border-b border-border/50 py-3 transition-colors hover:bg-bg-hover {isRead ? 'opacity-50' : ''}"
				>
					<div class="min-w-0 flex-1">
						<p class="text-sm">
							{#if chapter.chapter}
								<span class="font-medium">Ch. {chapter.chapter}</span>
							{/if}
							{#if chapter.title}
								<span class="text-text-secondary"> — {chapter.title}</span>
							{/if}
						</p>
						<p class="mt-0.5 text-[10px] text-text-muted">
							{#if isExternal}
								<span class="text-amber-500/80">External</span> &middot;
							{/if}
							{#if chapter.scanlationGroup}
								{chapter.scanlationGroup} &middot;
							{/if}
							{new Date(chapter.publishAt).toLocaleDateString()}
						</p>
					</div>
					{#if isRead}
						<svg class="h-4 w-4 flex-shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M20 6 9 17l-5-5" />
						</svg>
					{:else if isExternal}
						<svg class="h-4 w-4 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
							<polyline points="15 3 21 3 21 9" />
							<line x1="10" y1="14" x2="21" y2="3" />
						</svg>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	.pt-safe-top {
		padding-top: max(1rem, env(safe-area-inset-top));
	}

	.pt-safe-top-btn {
		top: max(0.75rem, env(safe-area-inset-top));
	}
</style>
