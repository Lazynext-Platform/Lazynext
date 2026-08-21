#!/usr/bin/env node
// Lazynext CLI — command-line interface for developers and power users.
// Talks to the Lazynext API Gateway (/api/v1). Configure with:
//   lazynext config set --url http://localhost:5199 --key <LAZYNEXT_API_KEY>
// or env: LAZYNEXT_URL, LAZYNEXT_API_KEY
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolveConfig, writeConfigFile, type CliConfig } from './config';
import { Client, ApiError } from './client';
import { printJson, printTable, printKeyValue, relativeTime, dim, bold, green, red, yellow, cyan } from './ui';

const VERSION = '0.4.2';

interface GlobalFlags {
  url?: string;
  key?: string;
  json?: boolean;
}

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') { positional.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) { flags[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const name = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[name] = next; i++; }
      else flags[name] = true;
    } else if (a.startsWith('-') && a.length === 2) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) { flags[a.slice(1)] = next; i++; }
      else flags[a.slice(1)] = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function flag(args: ParsedArgs, ...names: string[]): string | undefined {
  for (const n of names) {
    const v = args.flags[n];
    if (typeof v === 'string') return v;
  }
  return undefined;
}
function flagBool(args: ParsedArgs, ...names: string[]): boolean {
  return names.some((n) => args.flags[n] === true || args.flags[n] === 'true');
}

function makeClient(globals: GlobalFlags): { client: Client; config: CliConfig } {
  const config = resolveConfig({ url: globals.url, key: globals.key });
  if (!config.key) {
    process.stderr.write(yellow('Warning: no API key configured. Set LAZYNEXT_API_KEY or run `lazynext config set --key <key>`.\n'));
  }
  return { client: new Client(config), config };
}

function out(globals: GlobalFlags, value: unknown): void {
  if (globals.json) printJson(value);
}

async function run<T>(fn: () => Promise<T>): Promise<number> {
  try {
    await fn();
    return 0;
  } catch (error) {
    if (error instanceof ApiError) {
      process.stderr.write(red(`Error ${error.status}: ${error.message}`) + (error.code ? dim(` (${error.code})`) : '') + '\n');
    } else {
      process.stderr.write(red(`Error: ${error instanceof Error ? error.message : String(error)}`) + '\n');
    }
    return 1;
  }
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  const args = process.platform === 'win32' ? ['', url] : [url];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

// ── Commands ────────────────────────────────────────────────────────────────

const HELP = `${bold('Lazynext CLI')} ${dim(VERSION)}
AI video editor, from the terminal.

${bold('Usage:')} lazynext <command> [subcommand] [flags]

${bold('Global flags:')}
  --url <url>     Gateway URL (default: http://localhost:5199; env: LAZYNEXT_URL)
  --key <key>     API key (env: LAZYNEXT_API_KEY)
  --json          Raw JSON output for scripting

${bold('Commands:')}
  status                    Show server status and capabilities
  projects list             List projects
  projects create           Create a project (--name, --description, --fps, --width, --height)
  projects get <id>         Show a project document
  projects delete <id>      Delete a project (--purge to remove the document too)
  media list                List uploaded media
  media upload <file>       Upload a media file
  media download <name>     Download media (--out <path>, default: current dir)
  search <query>            Full-text search (--project, --limit)
  agent tools               List MCP agent tools
  agent mcp                 Show MCP endpoint discovery info
  config set                Save --url/--key to ~/.lazynext/cli.json
  config show               Print current resolved configuration
  open [project-id]         Open the editor in your browser
  version                   Print CLI version
  help                      Show this help

${dim('Examples:')}
  lazynext config set --url http://localhost:5199 --key secret
  lazynext projects create --name "Demo" --json | jq -r .id
  lazynext media upload ./clip.mp4
  lazynext open f4dd844e-ab79-4c1b-a3de-f5db77adf506
`;

async function dispatch(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const globals: GlobalFlags = {
    url: flag(args, 'url'),
    key: flag(args, 'key'),
    json: flagBool(args, 'json'),
  };
  const cmd = args.positional[0];
  const sub = args.positional[1];

  if (!cmd || cmd === 'help' || flagBool(args, 'help', 'h')) { process.stdout.write(HELP); return 0; }
  if (cmd === 'version' || flagBool(args, 'version')) { process.stdout.write(VERSION + '\n'); return 0; }

  if (cmd === 'config') {
    if (sub === 'set') {
      const cfg: Partial<CliConfig> = {};
      if (globals.url) cfg.url = globals.url;
      if (globals.key) cfg.key = globals.key;
      writeConfigFile(cfg);
      process.stdout.write(green('Saved') + ` -> ${dim('~/.lazynext/cli.json')}\n`);
      return 0;
    }
    if (sub === 'show') {
      const config = resolveConfig({ url: globals.url, key: globals.key });
      printKeyValue([['url', config.url], ['key', config.key ? config.key.slice(0, 4) + '••••' : dim('(unset)')]]);
      return 0;
    }
    process.stderr.write('Usage: lazynext config set|show\n'); return 1;
  }

  if (cmd === 'open') {
    const config = resolveConfig({ url: globals.url, key: globals.key });
    const id = sub;
    const url = id ? `${config.url}/#/editor/${id}` : `${config.url}/`;
    process.stdout.write(`Opening ${cyan(url)}\n`);
    openBrowser(url);
    return 0;
  }

  const { client } = makeClient(globals);

  if (cmd === 'status') {
    return run(async () => {
      const r = await client.json<{ app: string; version: string; capabilities: Record<string, boolean>; mcpEndpoint: string }>({ method: 'GET', path: '/status' });
      if (globals.json) { out(globals, r); return; }
      printKeyValue([
        ['app', r.app], ['version', r.version], ['mcp endpoint', r.mcpEndpoint],
        ['capabilities', Object.entries(r.capabilities).filter(([, v]) => v).map(([k]) => k).join(', ') || dim('none')],
      ]);
    });
  }

  if (cmd === 'projects') {
    if (sub === 'list') {
      return run(async () => {
        const r = await client.json<{ projects: { id: string; name: string; updatedAt: number; description?: string }[]; total: number }>({ method: 'GET', path: '/projects', query: { includeDeleted: flagBool(args, 'include-deleted') } });
        if (globals.json) { out(globals, r); return; }
        printTable(r.projects.map((p) => ({ id: p.id.slice(0, 8), name: p.name || dim('(unnamed)'), updated: relativeTime(p.updatedAt), description: p.description ?? '' })), [
          { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'updated', label: 'Updated' }, { key: 'description', label: 'Description' },
        ]);
        process.stdout.write(dim(`${r.total} project(s)`) + '\n');
      });
    }
    if (sub === 'create') {
      return run(async () => {
        const body: Record<string, unknown> = {};
        const name = flag(args, 'name'); if (name) body.name = name;
        const desc = flag(args, 'description'); if (desc) body.description = desc;
        const fps = flag(args, 'fps'); if (fps) body.fps = Number(fps);
        const w = flag(args, 'width'); if (w) body.compositionWidth = Number(w);
        const h = flag(args, 'height'); if (h) body.compositionHeight = Number(h);
        const r = await client.json<{ id: string; name: string }>({ method: 'POST', path: '/projects', body });
        if (globals.json) { out(globals, r); return; }
        process.stdout.write(green('Created') + ` ${bold(r.id)} — ${r.name || dim('(unnamed)')}\n`);
      });
    }
    if (sub === 'get') {
      const id = args.positional[2];
      if (!id) { process.stderr.write(red('projects get requires an id') + '\n'); return 1; }
      return run(async () => {
        const r = await client.json({ method: 'GET', path: `/projects/${id}` });
        out(globals, r);
        if (!globals.json) printJson(r);
      });
    }
    if (sub === 'delete') {
      const id = args.positional[2];
      if (!id) { process.stderr.write(red('projects delete requires an id') + '\n'); return 1; }
      return run(async () => {
        const r = await client.json<{ ok: boolean; purged: boolean }>({ method: 'DELETE', path: `/projects/${id}`, query: { purge: flagBool(args, 'purge') } });
        if (globals.json) { out(globals, r); return; }
        process.stdout.write(green('Deleted') + ` ${id}${r.purged ? ' ' + dim('(purged)') : ''}\n`);
      });
    }
    process.stderr.write('Usage: lazynext projects list|create|get|delete\n'); return 1;
  }

  if (cmd === 'media') {
    if (sub === 'list') {
      return run(async () => {
        const r = await client.json<{ media: { name: string; bytes: number; mime: string }[]; total: number }>({ method: 'GET', path: '/media' });
        if (globals.json) { out(globals, r); return; }
        printTable(r.media.map((m) => ({ name: m.name.slice(0, 36), mime: m.mime, size: formatBytes(m.bytes) })), [
          { key: 'name', label: 'Name' }, { key: 'mime', label: 'Type' }, { key: 'size', label: 'Size' },
        ]);
        process.stdout.write(dim(`${r.total} file(s)`) + '\n');
      });
    }
    if (sub === 'upload') {
      const file = args.positional[2];
      if (!file || !existsSync(file)) { process.stderr.write(red('media upload requires an existing file path') + '\n'); return 1; }
      return run(async () => {
        const r = await client.uploadFile(file) as { name: string; storedName: string; url: string; bytes: number };
        if (globals.json) { out(globals, r); return; }
        process.stdout.write(green('Uploaded') + ` ${r.name} -> ${r.storedName} (${formatBytes(r.bytes)})\n`);
      });
    }
    if (sub === 'download') {
      const name = args.positional[2];
      if (!name) { process.stderr.write(red('media download requires a media name') + '\n'); return 1; }
      const outPath = flag(args, 'out') ?? name;
      return run(async () => {
        const r = await client.downloadFile(name, outPath);
        if (globals.json) { out(globals, { name, out: outPath, bytes: r.bytes }); return; }
        process.stdout.write(green('Downloaded') + ` ${name} -> ${outPath} (${formatBytes(r.bytes)})\n`);
      });
    }
    process.stderr.write('Usage: lazynext media list|upload|download\n'); return 1;
  }

  if (cmd === 'search') {
    const q = args.positional.slice(1).join(' ').trim();
    if (!q) { process.stderr.write(red('search requires a query') + '\n'); return 1; }
    return run(async () => {
      const r = await client.json<{ hits: { ref?: string; score?: number; snippet?: string }[] }>({ method: 'GET', path: '/search', query: { q, project: flag(args, 'project'), limit: flag(args, 'limit') } });
      if (globals.json) { out(globals, r); return; }
      printTable(r.hits.map((h, i) => ({ '#': i + 1, ref: String(h.ref ?? '').slice(0, 30), score: h.score?.toFixed(2) ?? '', snippet: String(h.snippet ?? '').slice(0, 50) })), [
        { key: '#', label: '#', width: 4 }, { key: 'ref', label: 'Ref' }, { key: 'score', label: 'Score', width: 8 }, { key: 'snippet', label: 'Snippet' },
      ]);
    });
  }

  if (cmd === 'agent') {
    if (sub === 'tools') {
      return run(async () => {
        const r = await client.json<{ control: { name: string; description?: string }[]; offline: { name: string; description?: string }[] }>({ method: 'GET', path: '/agent/tools' });
        if (globals.json) { out(globals, r); return; }
        const all = [...r.control.map((t) => ({ name: t.name, kind: 'control', description: t.description ?? '' })), ...r.offline.map((t) => ({ name: t.name, kind: 'offline', description: t.description ?? '' }))];
        printTable(all, [{ key: 'name', label: 'Tool' }, { key: 'kind', label: 'Kind', width: 8 }, { key: 'description', label: 'Description' }]);
      });
    }
    if (sub === 'mcp') {
      return run(async () => {
        const r = await client.json<{ protocol: string; url: string; auth: string; tokenConfigured: boolean }>({ method: 'GET', path: '/agent/mcp' });
        if (globals.json) { out(globals, r); return; }
        printKeyValue([['protocol', r.protocol], ['url', r.url], ['auth', r.auth], ['token', r.tokenConfigured ? green('configured') : red('unset')]]);
      });
    }
    process.stderr.write('Usage: lazynext agent tools|mcp\n'); return 1;
  }

  process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`);
  return 1;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Entry ───────────────────────────────────────────────────────────────────
dispatch(process.argv.slice(2)).then((code) => process.exit(code)).catch((error) => {
  process.stderr.write(red(`Fatal: ${error instanceof Error ? error.message : String(error)}`) + '\n');
  process.exit(1);
});
