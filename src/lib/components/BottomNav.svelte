<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{
			href: '/',
			label: 'Home',
			icon: 'home',
		},
		{
			href: '/discover',
			label: 'Discover',
			icon: 'compass',
		},
		{
			href: '/library',
			label: 'Library',
			icon: 'bookmark',
		},
		{
			href: '/settings',
			label: 'Settings',
			icon: 'settings',
		},
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated/95 pb-safe-bottom backdrop-blur-xl">
	<div class="mx-auto flex max-w-3xl items-center justify-around">
		{#each tabs as tab}
			{@const active = isActive(tab.href)}
			<a
				href={tab.href}
				class="flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] transition-colors {active
					? 'text-accent'
					: 'text-text-muted hover:text-text-secondary'}"
			>
				{#if tab.icon === 'home'}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
						<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
						{#if !active}<polyline points="9 22 9 12 15 12 15 22" />{/if}
					</svg>
				{:else if tab.icon === 'compass'}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? 'currentColor' : 'none'} />
					</svg>
				{:else if tab.icon === 'bookmark'}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
						<path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
					</svg>
				{:else if tab.icon === 'settings'}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				{/if}
				<span>{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.pb-safe-bottom {
		padding-bottom: max(0.25rem, env(safe-area-inset-bottom));
	}
</style>
