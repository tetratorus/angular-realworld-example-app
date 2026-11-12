import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const media = fileURLToPath(new URL('../realworld/assets/media', import.meta.url));
const assets = fileURLToPath(new URL('./public/assets', import.meta.url));

// Serve the same shared media (logo, default avatar) at /assets, as Angular does.
mkdirSync(assets, { recursive: true });
for (const f of readdirSync(media)) if (f.endsWith('.svg')) cpSync(`${media}/${f}`, `${assets}/${f}`);

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, fs: { allow: ['..'] } },
});
