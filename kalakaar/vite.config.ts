import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		// Attempt to exclude the problematic chunk again
		exclude: ['chunk-OZ5NLBK3'] 
	},
	// Remove invalid server.force setting
	// server: {
	// 	force: true, 
	// }
});
