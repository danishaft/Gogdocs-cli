/**
 * Authentication commands: login, logout, status
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import open from 'open';
import auth from '../../api/auth.js';
import config from '../../utils/config.js';
import { output, outputSuccess, text } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';

export function createAuthCommand(): Command {
  const authCmd = new Command('auth')
    .description('Manage Google authentication')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Log in with Google OAuth')}
  google-docs-cli auth login

  ${chalk.dim('# Check current authentication status')}
  google-docs-cli auth status

  ${chalk.dim('# Log out and clear stored credentials')}
  google-docs-cli auth logout

${chalk.bold('Setup:')}
  Before using google-docs-cli, you need to set up OAuth credentials:

  1. Go to ${chalk.cyan('https://console.cloud.google.com/')}
  2. Create or select a project
  3. Enable the Google Docs API
  4. Create OAuth 2.0 credentials (Desktop application)
  5. Download the JSON file
  6. Save it as: ${chalk.yellow(config.getCredentialsPath())}
`);

  // Login command
  authCmd
    .command('login')
    .description('Authenticate with Google using OAuth')
    .option('--no-browser', 'Print auth URL instead of opening browser')
    .action(async (options) => {
      const format = authCmd.parent?.opts().format as OutputFormat ?? 'text';

      if (!auth.hasCredentials()) {
        console.log(text.error('No credentials file found.'));
        console.log();
        console.log(text.header('Setup Instructions:'));
        console.log(`
1. Go to ${chalk.cyan('https://console.cloud.google.com/')}
2. Create a new project or select an existing one
3. Enable the ${chalk.bold('Google Docs API')}
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth client ID"
6. Select "Desktop app" as the application type
7. Download the JSON file
8. Save it as: ${chalk.yellow(config.getCredentialsPath())}

Then run ${chalk.cyan('google-docs-cli auth login')} again.
`);
        process.exit(1);
      }

      const spinner = ora('Opening browser for authentication...').start();

      try {
        await auth.login();
        spinner.succeed('Successfully authenticated with Google!');

        const status = await auth.getAuthStatus();
        if (status.email) {
          console.log(text.labelValue('Logged in as', status.email));
        }

        if (format === 'json') {
          output({ success: true, email: status.email }, format);
        }
      } catch (error) {
        spinner.fail('Authentication failed');
        throw error;
      }
    });

  // Logout command
  authCmd
    .command('logout')
    .description('Clear stored authentication tokens')
    .option('--all', 'Also remove credentials file')
    .action(async (options) => {
      const format = authCmd.parent?.opts().format as OutputFormat ?? 'text';

      auth.logout();

      if (options.all) {
        config.clearAll();
        outputSuccess('Logged out and removed all credentials', undefined, format);
      } else {
        outputSuccess('Logged out successfully', undefined, format);
      }
    });

  // Status command
  authCmd
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
      const format = authCmd.parent?.opts().format as OutputFormat ?? 'text';

      const status = await auth.getAuthStatus();

      if (format === 'json') {
        output(status, format);
        return;
      }

      console.log(text.header('Authentication Status'));
      console.log();

      if (status.authenticated) {
        console.log(text.success('Authenticated'));
        console.log();

        if (status.email) {
          console.log(text.labelValue('Account', status.email));
        }

        if (status.expiresAt) {
          const now = new Date();
          if (status.expiresAt > now) {
            const mins = Math.round((status.expiresAt.getTime() - now.getTime()) / 60000);
            console.log(text.labelValue('Token expires', `in ${mins} minutes`));
          } else {
            console.log(text.labelValue('Token', 'expired (will auto-refresh)'));
          }
        }

        console.log(text.labelValue('Refresh token', status.hasRefreshToken ? 'available' : 'not available'));
      } else {
        console.log(text.warning('Not authenticated'));
        console.log();
        console.log(`Run ${chalk.cyan('google-docs-cli auth login')} to authenticate.`);

        if (!auth.hasCredentials()) {
          console.log();
          console.log(text.warning('No credentials file found.'));
          console.log(`See ${chalk.cyan('google-docs-cli auth login --help')} for setup instructions.`);
        }
      }
    });

  return authCmd;
}

export default createAuthCommand;
