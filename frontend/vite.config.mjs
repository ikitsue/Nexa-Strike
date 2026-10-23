import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: path.resolve(appDirectory, 'node_modules/react'),
      },
      {
        find: 'react-router-dom',
        replacement: path.resolve(appDirectory, 'node_modules/react-router-dom'),
      },
    ],
  },
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001,
  },
  preview: {
    port: 4173,
  },
});
