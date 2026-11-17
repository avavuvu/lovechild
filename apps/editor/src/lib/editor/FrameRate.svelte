<script lang="ts">
    import { frameRate } from './frames.svelte'
</script>

<output class="mono">{Math.round(frameRate.fps)} fps {Math.round(frameRate.slowest)} ms</output>

<style>
    output {
        position: absolute;
        right: var(--gap);
        bottom: var(--gap);
        padding: 0 0.5ch;
        background: var(--color-line-background);
        color: var(--color-foreground);
        pointer-events: none;
    }
</style>
