import { readable } from 'svelte/store';

/** Vitest browser stubs for SvelteKit page stores. */
export const page = readable({
	url: new URL('http://localhost:3000/'),
	params: {},
	route: { id: '/' },
	status: 200,
	error: null,
	data: {},
	form: undefined,
	state: {}
});

export const navigating = readable(null);

export const updated = readable(false);
