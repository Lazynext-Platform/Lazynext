#!/usr/bin/env node
// Publish the Lazynext CLI to npm.
// Builds the CLI, writes a publishable package.json into cli/dist/, and publishes.
// Usage: node scripts/publish-cli.mjs [--dry-run]
// Prereq: npm login (you must be a member of the @lazynext org or own the package name).
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// 1. Build the CLI
console.log('[publish-cli] Building CLI…');
execSync('npm run cli:build', { cwd: root, stdio: 'inherit' });

// 2. Write a publishable package.json into cli/dist/
const cliPkg = {
  name: rootPkg.name === 'lazynext' ? 'lazynext-cli' : `${rootPkg.name}-cli`,
  version: rootPkg.version,
  description: 'Command-line interface for Lazynext — AI video editor',
  bin: { lazynext: 'bin/lazynext.cjs' },
  type: 'commonjs',
  main: 'index.js',
  engines: { node: '>=18' },
  files: ['bin/', '*.js'],
  keywords: ['lazynext', 'cli', 'video-editor', 'ai', 'mcp', 'api'],
  license: rootPkg.license || 'UNLICENSED',
  author: rootPkg.author,
  homepage: 'https://github.com/Lazynext-Platform/Lazynext',
  repository: { type: 'git', url: 'https://github.com/Lazynext-Platform/Lazynext.git', directory: 'cli' },
  bugs: { url: 'https://github.com/Lazynext-Platform/Lazynext/issues' },
};

const distPkgPath = resolve(root, 'cli/dist/package.json');
writeFileSync(distPkgPath, JSON.stringify(cliPkg, null, 2) + '\n');
console.log(`[publish-cli] Wrote ${distPkgPath}`);

// 3. Copy the bin loader into dist/bin/
import { mkdirSync, copyFileSync } from 'node:fs';
mkdirSync(resolve(root, 'cli/dist/bin'), { recursive: true });
copyFileSync(resolve(root, 'cli/bin/lazynext.cjs'), resolve(root, 'cli/dist/bin/lazynext.cjs'));
console.log('[publish-cli] Copied bin/lazynext.cjs into dist/');

// 4. Publish
const cmd = dryRun ? 'npm publish --dry-run' : 'npm publish';
console.log(`[publish-cli] Running: ${cmd} (in cli/dist/)`);
execSync(cmd, { cwd: resolve(root, 'cli/dist'), stdio: 'inherit' });

console.log(dryRun
  ? '[publish-cli] Dry run complete. Run without --dry-run to publish.'
  : `[publish-cli] Published ${cliPkg.name}@${cliPkg.version} to npm.`);
