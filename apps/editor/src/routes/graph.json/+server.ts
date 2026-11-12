import { json } from '@sveltejs/kit'
import { createGraph } from '$lib/server/graph'

export const prerender = true

export const GET = () => json(createGraph())
