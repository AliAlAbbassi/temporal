<script lang="ts">
	import { browser } from '$app/environment';
	import { getReadingMode, setReadingMode, type ReadingMode } from '$lib/stores/progress';

	let defaultMode = $state<ReadingMode>('paged');
	let exportStatus = $state('');
	let importStatus = $state('');

	$effect(() => {
		if (browser) {
			defaultMode = getReadingMode();
		}
	});

	function handleModeChange(mode: ReadingMode) {
		defaultMode = mode;
		setReadingMode(mode);
	}

	function exportData() {
		if (!browser) return;
		const data: Record<string, any> = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('manga_')) {
				try {
					data[key] = JSON.parse(localStorage.getItem(key) || '');
				} catch {
					data[key] = localStorage.getItem(key);
				}
			}
		}

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `temporal-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		exportStatus = 'Exported successfully';
		setTimeout(() => (exportStatus = ''), 3000);
	}

	function importData() {
		if (!browser) return;
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const data = JSON.parse(text);
				let count = 0;
				for (const [key, value] of Object.entries(data)) {
					if (key.startsWith('manga_')) {
						localStorage.setItem(key, JSON.stringify(value));
						count++;
					}
				}
				importStatus = `Imported ${count} entries. Refresh to see changes.`;
			} catch {
				importStatus = 'Import failed — invalid file';
			}
			setTimeout(() => (importStatus = ''), 5000);
		};
		input.click();
	}

	function clearAllData() {
		if (!browser) return;
		if (!confirm('This will delete all your reading progress, library, and settings. Continue?')) return;
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('manga_')) keys.push(key);
		}
		keys.forEach((k) => localStorage.removeItem(k));
		location.reload();
	}

	// Stats
	let stats = $state({ chapters: 0, manga: 0, library: 0 });
	$effect(() => {
		if (!browser) return;
		try {
			const progress = JSON.parse(localStorage.getItem('manga_progress') || '{}');
			const readChapters = JSON.parse(localStorage.getItem('manga_read_chapters') || '{}');
			const lib = JSON.parse(localStorage.getItem('manga_library') || '[]');
			const totalChapters = Object.values(readChapters).reduce(
				(sum: number, chs: any) => sum + (Array.isArray(chs) ? chs.length : 0),
				0,
			);
			stats = {
				chapters: totalChapters as number,
				manga: Object.keys(progress).length,
				library: lib.length,
			};
		} catch {}
	});
</script>

<svelte:head>
	<title>Settings — Temporal</title>
</svelte:head>

<div class="flex min-h-dvh flex-col pb-20">
	<header class="sticky top-0 z-30 border-b border-border bg-bg/90 px-4 py-3 pt-safe-top backdrop-blur-xl">
		<div class="mx-auto max-w-3xl">
			<h1 class="text-xl font-bold tracking-tight">Settings</h1>
		</div>
	</header>

	<main class="flex-1 px-4 py-4">
		<div class="mx-auto flex max-w-3xl flex-col gap-6">
			<!-- Stats -->
			<section>
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Reading Stats</h2>
				<div class="grid grid-cols-3 gap-3">
					<div class="rounded-xl bg-bg-surface p-4 text-center">
						<p class="text-2xl font-bold text-accent">{stats.chapters}</p>
						<p class="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Chapters Read</p>
					</div>
					<div class="rounded-xl bg-bg-surface p-4 text-center">
						<p class="text-2xl font-bold text-accent">{stats.manga}</p>
						<p class="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Manga Started</p>
					</div>
					<div class="rounded-xl bg-bg-surface p-4 text-center">
						<p class="text-2xl font-bold text-accent">{stats.library}</p>
						<p class="mt-1 text-[10px] uppercase tracking-wider text-text-muted">In Library</p>
					</div>
				</div>
			</section>

			<!-- Reading -->
			<section>
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Reader</h2>
				<div class="rounded-xl bg-bg-surface">
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<p class="text-sm">Default Reading Mode</p>
							<p class="text-[10px] text-text-muted">Applied to new manga</p>
						</div>
						<div class="flex gap-1 rounded-lg bg-bg-hover p-0.5">
							<button
								onclick={() => handleModeChange('paged')}
								class="rounded-md px-3 py-1 text-xs transition-colors {defaultMode === 'paged'
									? 'bg-accent text-white'
									: 'text-text-muted hover:text-text'}"
							>
								Paged
							</button>
							<button
								onclick={() => handleModeChange('scroll')}
								class="rounded-md px-3 py-1 text-xs transition-colors {defaultMode === 'scroll'
									? 'bg-accent text-white'
									: 'text-text-muted hover:text-text'}"
							>
								Scroll
							</button>
						</div>
					</div>
				</div>
			</section>

			<!-- Data -->
			<section>
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">Data</h2>
				<div class="flex flex-col gap-2">
					<button
						onclick={exportData}
						class="flex items-center gap-3 rounded-xl bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-hover"
					>
						<svg class="h-5 w-5 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						<div>
							<p class="text-sm">Export Data</p>
							<p class="text-[10px] text-text-muted">Download library, progress, and settings as JSON</p>
						</div>
					</button>
					{#if exportStatus}
						<p class="px-4 text-xs text-emerald-400">{exportStatus}</p>
					{/if}

					<button
						onclick={importData}
						class="flex items-center gap-3 rounded-xl bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-hover"
					>
						<svg class="h-5 w-5 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						<div>
							<p class="text-sm">Import Data</p>
							<p class="text-[10px] text-text-muted">Restore from a backup file</p>
						</div>
					</button>
					{#if importStatus}
						<p class="px-4 text-xs text-amber-400">{importStatus}</p>
					{/if}

					<button
						onclick={clearAllData}
						class="flex items-center gap-3 rounded-xl bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-hover"
					>
						<svg class="h-5 w-5 flex-shrink-0 text-red-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
						<div>
							<p class="text-sm text-red-400/80">Clear All Data</p>
							<p class="text-[10px] text-text-muted">Delete all progress, library, and settings</p>
						</div>
					</button>
				</div>
			</section>

			<!-- About -->
			<section>
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">About</h2>
				<div class="rounded-xl bg-bg-surface px-4 py-3">
					<p class="text-sm font-medium">Temporal</p>
					<p class="mt-1 text-[10px] text-text-muted">Sources: MangaDex, MangaPill</p>
				</div>
			</section>
		</div>
	</main>
</div>

<style>
	.pt-safe-top {
		padding-top: max(0.75rem, env(safe-area-inset-top));
	}
</style>
