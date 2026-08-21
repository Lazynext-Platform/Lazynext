// CLI configuration: flags > env > config file > defaults.
// Config file lives at ~/.lazynext/cli.json (or $LAZYNEXT_CLI_CONFIG).
import { homedir } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface CliConfig {
  url: string;
  key: string;
}

const DEFAULT_URL = 'http://localhost:5199';

export function configPath(): string {
  return process.env.LAZYNEXT_CLI_CONFIG?.trim() || join(homedir(), '.lazynext', 'cli.json');
}

export function readConfigFile(): Partial<CliConfig> {
  const path = configPath();
  try {
    if (!existsSync(path)) return {};
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Partial<CliConfig>;
    }
  } catch {
    /* ignore corrupt config */
  }
  return {};
}

export function writeConfigFile(config: Partial<CliConfig>): void {
  const path = configPath();
  mkdirSync(join(path, '..'), { recursive: true });
  const existing = readConfigFile();
  writeFileSync(path, JSON.stringify({ ...existing, ...config }, null, 2) + '\n', 'utf8');
}

export function resolveConfig(flags: Partial<CliConfig>): CliConfig {
  const file = readConfigFile();
  const url = (flags.url || process.env.LAZYNEXT_URL || file.url || DEFAULT_URL).trim().replace(/\/+$/, '');
  const key = (flags.key || process.env.LAZYNEXT_API_KEY || file.key || '').trim();
  return { url, key };
}
