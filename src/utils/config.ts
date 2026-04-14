/**
 * Configuration management for google-docs-cli CLI.
 * Stores credentials and settings in ~/.google-docs-cli/.
 */

import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import type { OAuth2Client } from 'google-auth-library';

const CONFIG_DIR = join(homedir(), '.google-docs-cli');
const LEGACY_CONFIG_DIR = join(homedir(), '.gdocs');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');
const TOKEN_FILE = join(CONFIG_DIR, 'token.json');
const SESSION_FILE = join(CONFIG_DIR, 'session.json');

function migrateLegacyConfigDir(): void {
  if (!existsSync(LEGACY_CONFIG_DIR) || existsSync(CONFIG_DIR)) {
    return;
  }

  try {
    renameSync(LEGACY_CONFIG_DIR, CONFIG_DIR);
  } catch {
    cpSync(LEGACY_CONFIG_DIR, CONFIG_DIR, { recursive: true });
    rmSync(LEGACY_CONFIG_DIR, { recursive: true, force: true });
  }
}

// Ensure config directory exists.
function ensureConfigDir(): void {
  migrateLegacyConfigDir();
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

// User preferences store.
const config = new Conf<{
  defaultFormat: 'json' | 'table' | 'text';
  defaultDocId?: string;
  colorOutput: boolean;
}>({
  projectName: 'google-docs-cli',
  cwd: CONFIG_DIR,
  defaults: {
    defaultFormat: 'text',
    colorOutput: true,
  },
});

export function getConfigDir(): string {
  ensureConfigDir();
  return CONFIG_DIR;
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}

export function getTokenPath(): string {
  return TOKEN_FILE;
}

export function hasCredentials(): boolean {
  return existsSync(CREDENTIALS_FILE);
}

export function hasToken(): boolean {
  return existsSync(TOKEN_FILE);
}

export function saveCredentials(credentials: object): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}

export function loadCredentials(): object | null {
  if (!hasCredentials()) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveToken(token: object): void {
  ensureConfigDir();
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), {
    mode: 0o600,
  });
}

export function loadToken(): object | null {
  if (!hasToken()) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function clearToken(): void {
  if (existsSync(TOKEN_FILE)) {
    unlinkSync(TOKEN_FILE);
  }
}

export function clearAll(): void {
  clearToken();
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}

// User preferences
export function getDefaultFormat(): 'json' | 'table' | 'text' {
  return config.get('defaultFormat');
}

export function setDefaultFormat(format: 'json' | 'table' | 'text'): void {
  config.set('defaultFormat', format);
}

export function getDefaultDocId(): string | undefined {
  return config.get('defaultDocId');
}

export function setDefaultDocId(docId: string): void {
  config.set('defaultDocId', docId);
}

export function getColorOutput(): boolean {
  return config.get('colorOutput');
}

export function setColorOutput(enabled: boolean): void {
  config.set('colorOutput', enabled);
}

// Session document management.
export function getSessionDocument(): string | undefined {
  if (!existsSync(SESSION_FILE)) return undefined;
  try {
    const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
    return session.documentId;
  } catch {
    return undefined;
  }
}

export function setSessionDocument(documentId: string): void {
  ensureConfigDir();
  writeFileSync(SESSION_FILE, JSON.stringify({ documentId }, null, 2), {
    mode: 0o600,
  });
}

export function clearSessionDocument(): void {
  if (existsSync(SESSION_FILE)) {
    unlinkSync(SESSION_FILE);
  }
}

/**
 * Get the current document ID from multiple sources (in priority order):
 * 1. Explicit argument passed to function
 * 2. GOOGLE_DOCS_CLI_DOC environment variable
 * 3. Session document (set with `google-docs-cli use`)
 * 4. Default document ID from config
 */
export function getCurrentDocument(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (process.env.GOOGLE_DOCS_CLI_DOC) return process.env.GOOGLE_DOCS_CLI_DOC;
  const session = getSessionDocument();
  if (session) return session;
  return getDefaultDocId();
}

export default {
  getConfigDir,
  getCredentialsPath,
  getTokenPath,
  hasCredentials,
  hasToken,
  saveCredentials,
  loadCredentials,
  saveToken,
  loadToken,
  clearToken,
  clearAll,
  getDefaultFormat,
  setDefaultFormat,
  getDefaultDocId,
  setDefaultDocId,
  getColorOutput,
  setColorOutput,
  getSessionDocument,
  setSessionDocument,
  clearSessionDocument,
  getCurrentDocument,
};
