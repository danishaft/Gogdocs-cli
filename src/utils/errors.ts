/**
 * User-friendly error handling for google-docs-cli CLI
 */

import chalk from 'chalk';

export class GDocsError extends Error {
  public readonly code: string;
  public readonly suggestion?: string;

  constructor(message: string, code: string, suggestion?: string) {
    super(message);
    this.name = 'GDocsError';
    this.code = code;
    this.suggestion = suggestion;
  }
}

export class AuthError extends GDocsError {
  constructor(message: string, suggestion?: string) {
    super(message, 'AUTH_ERROR', suggestion);
    this.name = 'AuthError';
  }
}

export class DocumentError extends GDocsError {
  constructor(message: string, suggestion?: string) {
    super(message, 'DOCUMENT_ERROR', suggestion);
    this.name = 'DocumentError';
  }
}

export class ValidationError extends GDocsError {
  constructor(message: string, suggestion?: string) {
    super(message, 'VALIDATION_ERROR', suggestion);
    this.name = 'ValidationError';
  }
}

export class ApiError extends GDocsError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, suggestion?: string) {
    super(message, 'API_ERROR', suggestion);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Format an error for display to the user
 */
export function formatError(error: unknown): string {
  if (error instanceof GDocsError) {
    let output = chalk.red(`Error: ${error.message}`);
    if (error.suggestion) {
      output += '\n' + chalk.yellow(`Suggestion: ${error.suggestion}`);
    }
    return output;
  }

  if (error instanceof Error) {
    // Handle Google API errors
    if ('code' in error && 'errors' in error) {
      const apiError = error as { code: number; message: string; errors?: Array<{ message: string }> };
      let message = `API Error (${apiError.code}): ${apiError.message}`;

      // Add suggestions based on error code
      const suggestion = getApiErrorSuggestion(apiError.code);
      if (suggestion) {
        message += '\n' + chalk.yellow(`Suggestion: ${suggestion}`);
      }

      return chalk.red(message);
    }

    return chalk.red(`Error: ${error.message}`);
  }

  return chalk.red(`Error: ${String(error)}`);
}

/**
 * Get a helpful suggestion based on API error code
 */
function getApiErrorSuggestion(code: number): string | null {
  switch (code) {
    case 401:
      return 'Your authentication has expired. Run "google-docs-cli auth login" to re-authenticate.';
    case 403:
      return 'You don\'t have permission to access this document. Check sharing settings or request access.';
    case 404:
      return 'Document not found. Verify the document ID is correct and the document exists.';
    case 429:
      return 'Rate limit exceeded. Wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Google Docs service is temporarily unavailable. Try again in a few moments.';
    default:
      return null;
  }
}

/**
 * Handle an error and exit with appropriate code
 */
export function handleError(error: unknown): never {
  console.error(formatError(error));

  if (error instanceof AuthError) {
    process.exit(2);
  } else if (error instanceof ValidationError) {
    process.exit(3);
  } else if (error instanceof DocumentError) {
    process.exit(4);
  } else if (error instanceof ApiError) {
    process.exit(5);
  } else {
    process.exit(1);
  }
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<void>>(
  fn: T
): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
}
