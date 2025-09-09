import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    target: 'node20',
    outDir: 'dist',
    lib: {
      entry: {
        app: './src/app.ts',
        'cli/import-csv': './cli/import-csv.ts'
      },
      name: 'app',
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        'fs',
        'path',
        'crypto',
        'os',
        'util',
        'events',
        'stream',
        'url',
        'querystring',
        'http',
        'https',
        'net',
        'tls',
        'zlib',
        'buffer',
        'child_process',
        'cluster',
        'dgram',
        'dns',
        'domain',
        'readline',
        'repl',
        'string_decoder',
        'timers',
        'tty',
        'vm',
        'worker_threads',
        'perf_hooks',
        'async_hooks',
        'inspector',
        // Dependencies
        'express',
        '@prisma/client',
        'kuromoji',
        'csv-parser',
        'dotenv',
      ],
    },
    minify: false,
    sourcemap: true,
    emptyOutDir: false,
  },
});
