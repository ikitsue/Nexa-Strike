const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('node:path');

module.exports = defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: path.resolve(__dirname, 'node_modules/react'),
      },
      {
        find: 'react-router-dom',
        replacement: path.resolve(__dirname, 'node_modules/react-router-dom'),
      },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
});
