import { defineConfig } from 'wxt';

export default defineConfig({
  entrypointsDir: 'benchmark-entrypoints',
  publicDir: 'benchmark-public',
  outDir: '.output',
  outDirTemplate: 'benchmark-mv{{manifestVersion}}',
  manifest: {
    name: 'Website to Markdown Benchmark',
    description: 'Run the bundled Website to Markdown evaluation corpus locally.',
    version: '0.3.0',
  },
});
