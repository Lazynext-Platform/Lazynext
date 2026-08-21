#!/usr/bin/env node
// Lazynext CLI entry point (CommonJS). Loads the compiled CLI from ../dist/index.js.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const entry = path.join(__dirname, '..', 'dist', 'index.js');
if (!fs.existsSync(entry)) {
  process.stderr.write('Lazynext CLI is not built. Run `npm run cli:build` first.\n');
  process.exit(1);
}
require(entry);
