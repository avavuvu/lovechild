<script lang="ts">
    import type { Notice } from './messages'

    let { notices, height = $bindable(0) }: {
        notices: ReadonlyArray<Notice>
        height?: number
    } = $props()
</script>

<div class="notices" class:open={notices.length > 0} bind:clientHeight={height}>
    <ul>
        {#each notices as notice, index (index)}
            <li class={notice.kind}>{notice.text}</li>
        {/each}
    </ul>
</div>

<style>
    .notices {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 300ms ease;
    }

    .notices.open {
        grid-template-rows: 1fr;
        border: var(--border);
    }

    ul {
        min-height: 0;
        max-height: 30dvh;
        overflow: auto;
    }

    li {
        padding: 4px var(--gap);
        white-space: pre-wrap;
        color: var(--color-white);
    }

    li.error {
        background: var(--color-error);
    }

    li.warning {
        background: var(--color-warning);
    }

    @media (prefers-reduced-motion: reduce) {
        .notices {
            transition: none;
        }
    }
</style>
