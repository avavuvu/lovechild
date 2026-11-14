<script lang="ts">
    import { onMount } from 'svelte';
	import type { PageProps } from './$types';
    import { getExamplePlayer } from '$lib/player';
    import Backdrop from '$lib/Backdrop.svelte';

	let { data }: PageProps = $props();

	const player = getExamplePlayer()
    const id = Symbol(data.example.name)

	onMount(() => {
	    player.play({ id, code: data.example, onFrame: () => {} })
	})
</script>

<Backdrop />
