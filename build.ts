#!/usr/bin/env bun
import plugin from 'bun-plugin-tailwind';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';

/**
 * We need a build script for Bun.build() because
 * `bun build` does not support plugins (even from bunfig.toml) right now.
 */

const OUT_DIR = path.join(process.cwd(), 'dist');

/**
 * Format file size to human readable string
 */
const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

console.log('\n🚀 Starting build process...\n');

if (existsSync(OUT_DIR)) {
  console.log(`🗑️ Cleaning previous build at ${OUT_DIR}\n`);
  await rm(OUT_DIR, { recursive: true, force: true });
}

const start = performance.now();

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: OUT_DIR,
  plugins: [plugin],
  minify: true,
  target: 'bun',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});

const end = performance.now();

const outputTable = result.outputs.map((output) => ({
  File: path.relative(process.cwd(), output.path),
  Type: output.kind,
  Size: formatFileSize(output.size),
}));

console.table(outputTable);
const buildTime = (end - start).toFixed(2);

console.log(`\n✅ Build completed in ${buildTime}ms\n`);
