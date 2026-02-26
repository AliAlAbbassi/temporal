<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		getProgress,
		getReadChapters,
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

	$effect(() => {
		inLibrary = isInLibrary(manga.id);
		readChapters = getReadChapters(manga.id);
		progress = getProgress(manga.id);
	});

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
		} else if (manga.chapters.length > 0) {
			goto(`/read/${manga.chapters[0].id}?manga=${manga.id}`);
		}
	}

	const readCount = $derived(manga.chapters.filter((ch) => readChapters.has(ch.id)).length);
</script>

<svelte:head>
	<title>{manga.title} — Temporal</title>
</svelte:head>

<div class="min-h-dvh">
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
			<!-- Back button -->
			<button onclick={() => history.back()} class="mb-4 flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m15 18-6-6 6-6" />
				</svg>
				Back
			</button>

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
	<div class="mx-auto max-w-3xl px-4 pb-20 pt-4">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Chapters</h2>
		<div class="flex flex-col">
			{#each manga.chapters as chapter (chapter.id)}
				{@const isRead = readChapters.has(chapter.id)}
				<a
					href="/read/{chapter.id}?manga={manga.id}"
					class="flex items-center gap-3 border-b border-border/50 py-3 transition-colors hover:bg-bg-hover {isRead ? 'opacity-50' : ''}"
				>
					<div class="flex-1 min-w-0">
						<p class="text-sm">
							{#if chapter.chapter}
								<span class="font-medium">Ch. {chapter.chapter}</span>
							{/if}
							{#if chapter.title}
								<span class="text-text-secondary"> — {chapter.title}</span>
							{/if}
						</p>
						<p class="mt-0.5 text-[10px] text-text-muted">
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
</style>
