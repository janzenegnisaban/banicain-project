import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render the B-SAFE hero heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1, name: 'B-SAFE' });
		await expect.element(heading).toBeInTheDocument();
	});
});
