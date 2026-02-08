import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'path'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@contract': path.resolve(__dirname, '../contract/dist')
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-types',
      '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      '@midnight-ntwrk/ledger',
    ]
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/ledger-wasm-node'],
    include: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  }
})
