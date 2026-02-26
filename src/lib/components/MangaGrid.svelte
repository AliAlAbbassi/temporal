<script lang="ts">
	import { goto } from '$app/navigation';

	let { items }: { items: { id: string; title: string; coverUrl: string }[] } = $props();
</script>

<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
	{#each items as item (item.id)}
		<button
			onclick={() => goto(`/manga/${item.id}`)}
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
				{:else}
					<div class="flex h-full items-center justify-center text-text-muted">
						<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="3" y="3" width="18" height="18" rx="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<path d="m21 15-5-5L5 21" />
						</svg>
					</div>
				{/if}
				{#if item.id.startsWith('mangapill:')}
					<span class="absolute top-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">MP</span>
				{/if}
			</div>
			<p class="mt-1.5 line-clamp-2 text-xs leading-tight text-text-secondary">{item.title}</p>
		</button>
	{/each}
</div>
