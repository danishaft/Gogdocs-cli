/**
 * OAuth authentication flow for Google Docs API
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { authenticate } from '@google-cloud/local-auth';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import open from 'open';
import config from '../utils/config.js';
import { AuthError } from '../utils/errors.js';

// OAuth scopes required for Google Docs
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

let cachedClient: OAuth2Client | null = null;

function createOAuthClient(credentialsPath: string): OAuth2Client {
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  return new OAuth2Client(client_id, client_secret, redirect_uris[0]);
}

/**
 * Get an authenticated OAuth2 client
 * Returns cached client if available and valid
 */
export async function getAuthClient(): Promise<OAuth2Client> {
  if (cachedClient) {
    return cachedClient;
  }

  const tokenPath = config.getTokenPath();
  const credentialsPath = config.getCredentialsPath();

  if (!existsSync(credentialsPath)) {
    throw new AuthError(
      'No credentials file found.',
      'Run "google-docs-cli auth login" and follow the setup instructions to configure OAuth credentials.'
    );
  }

  // Try to load existing token
  if (existsSync(tokenPath)) {
    try {
      const token = JSON.parse(readFileSync(tokenPath, 'utf-8'));
      const client = createOAuthClient(credentialsPath);
      client.setCredentials(token);

      // Check if token is expired and refresh if needed
      if (token.expiry_date && token.expiry_date < Date.now()) {
        if (token.refresh_token) {
          const { credentials: newCredentials } = await client.refreshAccessToken();
          client.setCredentials(newCredentials);
          saveToken(newCredentials);
        } else {
          throw new AuthError(
            'Token expired and no refresh token available.',
            'Run "google-docs-cli auth login" to re-authenticate.'
          );
        }
      }

      cachedClient = client;
      return client;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      // Token file corrupt or invalid, will need to re-authenticate
      console.warn('Existing token invalid, re-authentication required.');
    }
  }

  throw new AuthError(
    'Not authenticated.',
    'Run "google-docs-cli auth login" to authenticate with Google.'
  );
}

/**
 * Perform interactive OAuth login flow
 */
export async function login(): Promise<OAuth2Client> {
  const credentialsPath = config.getCredentialsPath();

  if (!existsSync(credentialsPath)) {
    throw new AuthError(
      'No credentials file found.',
      `To set up authentication:
1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable the Google Docs API
4. Go to "APIs & Services" > "Credentials"
5. Create an OAuth 2.0 Client ID (Desktop application type)
6. Download the JSON file
7. Save it as: ${credentialsPath}`
    );
  }

  try {
    const localClient = await authenticate({
      scopes: SCOPES,
      keyfilePath: credentialsPath,
    });

    if (localClient.credentials) {
      saveToken(localClient.credentials);
      const client = createOAuthClient(credentialsPath);
      client.setCredentials(localClient.credentials);
      cachedClient = client;
      return client;
    }

    const client = createOAuthClient(credentialsPath);
    cachedClient = client;
    return client;
  } catch (error) {
    throw new AuthError(
      `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      'Ensure your credentials file is valid and try again.'
    );
  }
}

/**
 * Log out by clearing stored tokens
 */
export function logout(): void {
  config.clearToken();
  cachedClient = null;
}

/**
 * Check current authentication status
 */
export async function getAuthStatus(): Promise<{
  authenticated: boolean;
  email?: string;
  expiresAt?: Date;
  hasRefreshToken: boolean;
}> {
  const tokenPath = config.getTokenPath();
  const credentialsPath = config.getCredentialsPath();

  if (!existsSync(credentialsPath)) {
    return { authenticated: false, hasRefreshToken: false };
  }

  if (!existsSync(tokenPath)) {
    return { authenticated: false, hasRefreshToken: false };
  }

  try {
    const token = JSON.parse(readFileSync(tokenPath, 'utf-8'));
    const hasRefreshToken = !!token.refresh_token;

    // Try to get user info
    let email: string | undefined;
    try {
      const client = await getAuthClient();
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email ?? undefined;
    } catch {
      // Could not get user info, but still authenticated
    }

    return {
      authenticated: true,
      email,
      expiresAt: token.expiry_date ? new Date(token.expiry_date) : undefined,
      hasRefreshToken,
    };
  } catch {
    return { authenticated: false, hasRefreshToken: false };
  }
}

/**
 * Save token to config directory
 */
function saveToken(credentials: object): void {
  config.saveToken(credentials);
}

/**
 * Check if we have valid credentials file
 */
export function hasCredentials(): boolean {
  return config.hasCredentials();
}

/**
 * Check if we have a stored token
 */
export function hasToken(): boolean {
  return config.hasToken();
}

export default {
  getAuthClient,
  login,
  logout,
  getAuthStatus,
  hasCredentials,
  hasToken,
};
