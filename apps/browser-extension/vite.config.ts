/** @module vite.config Vite configuration for browser extension */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			input: {
				popup: resolve(__dirname, "index.html"),
				overlay: resolve(__dirname, "overlay.html"),
				background: resolve(__dirname, "src/background/service-worker.ts"),
				content: resolve(__dirname, "src/content/content-script.ts"),
			},
			output: {
				entryFileNames: (chunkInfo) => {
					if (chunkInfo.name === "background" || chunkInfo.name === "content") {
						return "[name].js"; // Keep these predictable for manifest.json
					}
					return "assets/[name]-[hash].js";
				},
			},
		},
	},
});
