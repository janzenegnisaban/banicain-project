/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

/** Required when SvelteKit client runtime loads outside the Kit app shell. */
Object.defineProperty(globalThis, '__SVELTEKIT_PAYLOAD__', {
	value: { data: {} },
	writable: true,
	configurable: true
});
