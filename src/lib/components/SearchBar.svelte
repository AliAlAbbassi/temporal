<script lang="ts">
	let { value = '', oninput }: { value: string; oninput: (query: string) => void } = $props();
	let inputEl: HTMLInputElement;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		oninput(target.value);
	}

	function clear() {
		oninput('');
		inputEl?.focus();
	}
</script>

<div class="relative">
	<svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</svg>
	<input
		bind:this={inputEl}
		type="text"
		{value}
		oninput={handleInput}
		placeholder="Search manga..."
		class="w-full rounded-xl bg-bg-surface py-2.5 pl-10 pr-10 text-sm text-text outline-none ring-1 ring-border transition-all placeholder:text-text-muted focus:ring-accent/50"
	/>
	{#if value}
		<button
			onclick={clear}
			aria-label="Clear search"
			class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6 6 18M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>
