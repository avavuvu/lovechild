import { json } from '@sveltejs/kit'
import { getGraph } from '$lib/server/graph'

export const prerender = true

export const GET = () => json(getGraph())
