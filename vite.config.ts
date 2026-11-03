import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig(env => ({
  plugins: [
    tailwindcss(),
    react(),
    crx({
      manifest: env => env.command === 'serve'
        ? { ...manifest, host_permissions: [...(manifest.host_permissions || []), 'http://localhost/*'] }
        : manifest,
    }),
  ],
  build: {
    outDir: env.command === 'serve' ? 'dev-dist' : 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
}));
