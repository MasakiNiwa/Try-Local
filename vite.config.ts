import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { litertlmWasm, LITERTLM_WASM_DIR } from './build/vite-plugin-litertlm-wasm.ts';

const require = createRequire(import.meta.url);
const appPkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const litertPkg = require('@litert-lm/core/package.json');

// https://vite.dev/config/
export default defineConfig({
  // 相対 base: GitHub Pages のサブパス（/Try-Local/）でもフォークでもそのまま動く
  base: './',
  plugins: [react(), tailwindcss(), litertlmWasm()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appPkg.version),
    __LITERTLM_VERSION__: JSON.stringify(litertPkg.version),
    __LITERTLM_WASM_DIR__: JSON.stringify(LITERTLM_WASM_DIR),
  },
  worker: {
    // LiteRT-LM の Wasm ローダーは importScripts() を使うため classic worker が必要
    format: 'iife',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
