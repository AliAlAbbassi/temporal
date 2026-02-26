<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();

	const showNav = $derived(
		!page.url.pathname.startsWith('/read/'),
	);
</script>

{@render children()}

{#if showNav}
	<BottomNav />
{/if}
