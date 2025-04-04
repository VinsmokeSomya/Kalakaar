import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use Vercel adapter with explicit configuration
		adapter: adapter({
			// Use default Vercel output directory
			runtime: 'nodejs18.x'
		})
	}
};

export default config;
