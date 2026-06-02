// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  integrations: [mdx()],
  vite: {
    server: {
      // Repo lives on a Windows-mounted drive under WSL2, where native file
      // watching doesn't fire. Poll so HMR (and content reloads) actually work.
      watch: { usePolling: true, interval: 300 },
    },
  },
});
