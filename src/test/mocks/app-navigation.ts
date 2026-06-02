/** Vitest browser stubs for SvelteKit navigation APIs. */
export async function goto() {
	return Promise.resolve();
}

export async function invalidate() {
	return Promise.resolve();
}

export async function invalidateAll() {
	return Promise.resolve();
}

export async function preloadData() {
	return Promise.resolve();
}

export async function preloadCode() {
	return Promise.resolve();
}

export function beforeNavigate() {
	return () => {};
}

export function afterNavigate() {
	return () => {};
}

export function disableScrollHandling() {}

export function pushState() {}

export function replaceState() {}
