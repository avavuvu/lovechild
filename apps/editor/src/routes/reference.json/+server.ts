import { json } from '@sveltejs/kit'
import { loadReference } from '$lib/server/reference'

export const prerender = true

export const GET = () => json(loadReference())
