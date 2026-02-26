<script lang="ts">
	import { goto } from '$app/navigation';
	import { saveProgress, markChapterRead, getReadingMode, setReadingMode, type ReadingMode } from '$lib/stores/progress';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pageData = $derived(data.pageData);
	const chapterId = $derived(data.chapterId);
	const mangaId = $derived(data.mangaId);
	const mangaTitle = $derived(data.mangaTitle);
	const mangaCover = $derived(data.mangaCover);
	const chapterNumber = $derived(data.chapterNumber);
	const prevChapterId = $derived(data.prevChapterId);
	const nextChapterId = $derived(data.nextChapterId);

	// Build proxied image URLs
	// MangaDex returns { baseUrl, hash, pages } — we construct proxy URLs
	// MangaPill returns { pages } — already full proxy URLs
	const pages = $derived(
		pageData.hash
			? pageData.pages.map(
					(filename: string) =>
						`/api/proxy/page/${pageData.hash}/${filename}?base=${encodeURIComponent(pageData.baseUrl)}&q=data`,
				)
			: pageData.pages,
	);

	const totalPages = $derived(pages.length);

	let mode: ReadingMode = $state('paged');
	let currentPage = $state(0);
	let showHud = $state(false);
	let hudTimeout: ReturnType<typeof setTimeout>;
	let containerEl: HTMLDivElement;
	let scrollEl: HTMLDivElement;
	let imageLoaded = $state(false);

	// Load saved reading mode on mount
	$effect(() => {
		mode = getReadingMode(mangaId ?? undefined);
	});

	function switchMode(newMode: ReadingMode) {
		mode = newMode;
		setReadingMode(newMode, mangaId ?? undefined);

		// When switching to scroll, scroll to current page
		if (newMode === 'scroll') {
			requestAnimationFrame(() => {
				const target = document.getElementById(`page-${currentPage}`);
				target?.scrollIntoView({ behavior: 'instant' });
			});
		}
	}

	// ── Paged mode logic ──

	// Preload adjacent pages (paged mode)
	$effect(() => {
		if (mode !== 'paged') return;
		const toPreload = [currentPage + 1, currentPage + 2, currentPage - 1].filter(
			(i) => i >= 0 && i < totalPages
		);
		for (const idx of toPreload) {
			const img = new Image();
			img.src = pages[idx];
			img.decode().catch(() => {});
		}
	});

	function goToPage(page: number) {
		if (page < 0 || page >= totalPages) return;
		imageLoaded = false;
		currentPage = page;
	}

	function nextPage() {
		if (currentPage < totalPages - 1) {
			goToPage(currentPage + 1);
		} else {
			finishChapter();
		}
	}

	function prevPage() {
		if (currentPage > 0) {
			goToPage(currentPage - 1);
		}
	}

	function finishChapter() {
		if (mangaId) markChapterRead(mangaId, chapterId);
		if (nextChapterId && mangaId) {
			goto(`/read/${nextChapterId}?manga=${mangaId}`);
		}
	}

	// ── Scroll mode logic ──

	let scrollPage = $state(0);

	function handleScroll() {
		if (mode !== 'scroll' || !scrollEl) return;

		// Determine which page is most visible
		const scrollTop = scrollEl.scrollTop;
		const viewportH = scrollEl.clientHeight;
		const center = scrollTop + viewportH / 2;

		for (let i = 0; i < totalPages; i++) {
			const el = document.getElementById(`page-${i}`);
			if (!el) continue;
			const top = el.offsetTop;
			const bottom = top + el.offsetHeight;
			if (center >= top && center < bottom) {
				scrollPage = i;
				break;
			}
		}

		// Check if scrolled to the very bottom
		if (scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 50) {
			// Near bottom — could auto-advance
		}
	}

	// Sync scrollPage to currentPage for progress saving
	$effect(() => {
		if (mode === 'scroll') {
			currentPage = scrollPage;
		}
	});

	// ── Shared logic ──

	// Save progress on page change (debounced)
	let saveTimeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		clearTimeout(saveTimeout);
		const page = currentPage;
		saveTimeout = setTimeout(() => {
			if (mangaId) {
				saveProgress({
					mangaId,
					chapterId,
					chapterNumber,
					page,
					totalPages,
					timestamp: Date.now(),
					mangaTitle: mangaTitle || '',
					coverUrl: mangaCover || '',
				});
			}
		}, 500);
	});

	function toggleHud() {
		showHud = !showHud;
		if (showHud) {
			clearTimeout(hudTimeout);
			hudTimeout = setTimeout(() => {
				showHud = false;
			}, 4000);
		}
	}

	function handleTapPaged(e: MouseEvent) {
		if (swiped) { swiped = false; return; }
		if ((e.target as HTMLElement).closest('[data-hud]')) return;

		const rect = containerEl.getBoundingClientRect();
		const relX = (e.clientX - rect.left) / rect.width;

		if (relX < 0.3) {
			nextPage();
		} else if (relX > 0.7) {
			prevPage();
		} else {
			toggleHud();
		}
	}

	function handleTapScroll(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('[data-hud]')) return;

		const rect = scrollEl.getBoundingClientRect();
		const relX = (e.clientX - rect.left) / rect.width;

		// In scroll mode, center tap toggles HUD
		if (relX > 0.25 && relX < 0.75) {
			toggleHud();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (mode === 'paged') {
			switch (e.key) {
				case 'ArrowLeft':
				case 'a':
					nextPage();
					break;
				case 'ArrowRight':
				case 'd':
					prevPage();
					break;
				case 'Escape':
					if (showHud) showHud = false;
					else goBack();
					break;
			}
		} else {
			switch (e.key) {
				case 'Escape':
					if (showHud) showHud = false;
					else goBack();
					break;
			}
		}
	}

	// Swipe detection (paged only)
	let touchStartX = 0;
	let touchStartY = 0;
	let swiped = false;

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
		swiped = false;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (mode !== 'paged') return;
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;

		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
			swiped = true;
			if (dx > 0) nextPage();
			else prevPage();
		}
	}

	function goBack() {
		if (mangaId) goto(`/manga/${mangaId}`);
		else history.back();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>
		{mangaTitle ? `${mangaTitle}` : 'Reading'}{chapterNumber ? ` Ch. ${chapterNumber}` : ''} — Temporal
	</title>
</svelte:head>

{#if mode === 'paged'}
	<!-- ═══ PAGED MODE ═══ -->
	<div
		bind:this={containerEl}
		class="fixed inset-0 bg-black select-none touch-none"
		role="presentation"
		onclick={handleTapPaged}
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		<div class="flex h-dvh w-full items-center justify-center">
			{#key currentPage}
				{#if !imageLoaded}
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="h-[80%] w-[60%] animate-pulse rounded-lg bg-white/5"></div>
					</div>
				{/if}
				<img
					src={pages[currentPage]}
					alt="Page {currentPage + 1}"
					class="max-h-full max-w-full object-contain transition-opacity duration-100"
					class:opacity-0={!imageLoaded}
					decoding="async"
					draggable="false"
					onload={() => (imageLoaded = true)}
				/>
			{/key}
		</div>

		<!-- Subtle page indicator -->
		<div class="pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2">
			<span class="rounded-full bg-black/60 px-2.5 py-1 text-[10px] tabular-nums text-white/40">
				{currentPage + 1} / {totalPages}
			</span>
		</div>
	</div>
{:else}
	<!-- ═══ SCROLL MODE ═══ -->
	<div
		bind:this={scrollEl}
		class="fixed inset-0 overflow-y-auto overflow-x-hidden bg-black select-none"
		role="presentation"
		onscroll={handleScroll}
		onclick={handleTapScroll}
	>
		<div class="mx-auto flex max-w-3xl flex-col items-center">
			{#each pages as pageUrl, i (i)}
				<div
					id="page-{i}"
					class="w-full"
				>
					<img
						src={pageUrl}
						alt="Page {i + 1}"
						class="w-full"
						loading={i < 3 ? 'eager' : 'lazy'}
						decoding="async"
						draggable="false"
					/>
				</div>
			{/each}

			<!-- End of chapter -->
			<div class="flex w-full flex-col items-center gap-4 py-16">
				<p class="text-sm text-white/40">End of Chapter{chapterNumber ? ` ${chapterNumber}` : ''}</p>
				{#if nextChapterId && mangaId}
					<button
						onclick={finishChapter}
						class="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
					>
						Next Chapter
					</button>
				{:else}
					<button
						onclick={goBack}
						class="rounded-xl bg-bg-surface px-6 py-3 text-sm text-white/60 transition-colors hover:text-white"
					>
						Back to Manga
					</button>
				{/if}
			</div>
		</div>

		<!-- Scroll progress indicator (right edge) -->
		<div class="pointer-events-none fixed right-1 top-0 bottom-0 flex items-center">
			<div class="h-[60%] w-0.5 rounded-full bg-white/10">
				<div
					class="w-full rounded-full bg-accent/60 transition-all duration-150"
					style="height: {((scrollPage + 1) / totalPages) * 100}%"
				></div>
			</div>
		</div>

		<!-- Subtle page indicator -->
		<div class="pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2">
			<span class="rounded-full bg-black/60 px-2.5 py-1 text-[10px] tabular-nums text-white/40">
				{scrollPage + 1} / {totalPages}
			</span>
		</div>
	</div>
{/if}

<!-- ═══ HUD OVERLAY (shared) ═══ -->
{#if showHud}
	<div
		data-hud
		class="fixed inset-0 z-50 pointer-events-none animate-fade-in"
	>
		<!-- Top bar -->
		<div class="pointer-events-auto flex items-center gap-3 bg-black/80 px-4 py-3 pt-safe-top backdrop-blur-sm">
			<button onclick={goBack} class="text-white/80 hover:text-white" aria-label="Go back">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>
			<div class="min-w-0 flex-1">
				{#if mangaTitle}
					<p class="truncate text-sm text-white/90">{mangaTitle}</p>
				{/if}
				{#if chapterNumber}
					<p class="text-xs text-white/50">Chapter {chapterNumber}</p>
				{/if}
			</div>

			<!-- Mode toggle -->
			<button
				onclick={() => switchMode(mode === 'paged' ? 'scroll' : 'paged')}
				class="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/20 hover:text-white"
				aria-label="Toggle reading mode"
			>
				{#if mode === 'paged'}
					<!-- Scroll icon -->
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 5v14M5 12l7 7 7-7" />
					</svg>
					Scroll
				{:else}
					<!-- Paged icon -->
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="7" height="18" rx="1" />
						<rect x="14" y="3" width="7" height="18" rx="1" />
					</svg>
					Paged
				{/if}
			</button>
		</div>

		<!-- Bottom bar -->
		<div class="pointer-events-auto absolute inset-x-0 bottom-0 bg-black/80 px-4 pb-safe-bottom pt-3 backdrop-blur-sm">
			{#if mode === 'paged'}
				<!-- Page slider (RTL for manga) -->
				<div class="flex items-center gap-3">
					<span class="w-8 text-right text-xs tabular-nums text-white/50">{totalPages}</span>
					<input
						type="range"
						min="0"
						max={totalPages - 1}
						value={currentPage}
						oninput={(e) => goToPage(Number((e.target as HTMLInputElement).value))}
						class="slider flex-1"
						style="direction: rtl"
					/>
					<span class="w-8 text-xs tabular-nums text-white/50">1</span>
				</div>
			{:else}
				<!-- Scroll progress bar -->
				<div class="flex items-center gap-3">
					<span class="w-8 text-right text-xs tabular-nums text-white/50">1</span>
					<input
						type="range"
						min="0"
						max={totalPages - 1}
						value={scrollPage}
						oninput={(e) => {
							const idx = Number((e.target as HTMLInputElement).value);
							const target = document.getElementById(`page-${idx}`);
							target?.scrollIntoView({ behavior: 'smooth' });
						}}
						class="slider flex-1"
					/>
					<span class="w-8 text-xs tabular-nums text-white/50">{totalPages}</span>
				</div>
			{/if}

			<!-- Chapter navigation -->
			<div class="mt-2 flex items-center justify-between pb-2">
				{#if mode === 'paged'}
					{#if nextChapterId && mangaId}
						<button
							onclick={() => goto(`/read/${nextChapterId}?manga=${mangaId}`)}
							class="text-xs text-accent hover:text-accent-hover"
						>
							Next Ch.
						</button>
					{:else}
						<span></span>
					{/if}
				{:else}
					{#if prevChapterId && mangaId}
						<button
							onclick={() => goto(`/read/${prevChapterId}?manga=${mangaId}`)}
							class="text-xs text-accent hover:text-accent-hover"
						>
							Prev Ch.
						</button>
					{:else}
						<span></span>
					{/if}
				{/if}

				<span class="text-sm font-medium tabular-nums text-white">
					{(mode === 'paged' ? currentPage : scrollPage) + 1} / {totalPages}
				</span>

				{#if mode === 'paged'}
					{#if prevChapterId && mangaId}
						<button
							onclick={() => goto(`/read/${prevChapterId}?manga=${mangaId}`)}
							class="text-xs text-accent hover:text-accent-hover"
						>
							Prev Ch.
						</button>
					{:else}
						<span></span>
					{/if}
				{:else}
					{#if nextChapterId && mangaId}
						<button
							onclick={() => goto(`/read/${nextChapterId}?manga=${mangaId}`)}
							class="text-xs text-accent hover:text-accent-hover"
						>
							Next Ch.
						</button>
					{:else}
						<span></span>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.pt-safe-top {
		padding-top: max(0.75rem, env(safe-area-inset-top));
	}

	.pb-safe-bottom {
		padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
	}

	.animate-fade-in {
		animation: fadeIn 150ms ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.15);
		outline: none;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #6d5dfc;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #6d5dfc;
		border: none;
		cursor: pointer;
	}
</style>
