import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use Vercel adapter with explicit configuration and recommended runtime
		adapter: adapter({
			runtime: 'nodejs20.x',
			// Explicitly define assets directory relative to the SvelteKit project root (kalakaar)
			assets: 'static'
		})
	}
};

export default config;
