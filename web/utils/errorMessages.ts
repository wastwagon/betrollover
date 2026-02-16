/**
 * User-friendly error message mapping
 * Maps technical errors to user-friendly messages with actionable guidance
 */

export interface ErrorMapping {
  pattern: RegExp | string;
  message: string;
  action?: string;
}

const errorMappings: ErrorMapping[] = [
  {
    pattern: /network|fetch|connection/i,
    message: 'Unable to connect to the server',
    action: 'Please check your internet connection and try again',
  },
  {
    pattern: /401|unauthorized/i,
    message: 'Your session has expired',
    action: 'Please log in again to continue',
  },
  {
    pattern: /403|forbidden/i,
    message: 'You don\'t have permission to perform this action',
    action: 'Please contact support if you believe this is an error',
  },
  {
    pattern: /404|not found/i,
    message: 'The requested resource was not found',
    action: 'Please try refreshing the page',
  },
  {
    pattern: /500|internal server error/i,
    message: 'Something went wrong on our end',
    action: 'Please try again in a few moments. If the problem persists, contact support',
  },
  {
    pattern: /insufficient|balance|funds/i,
    message: 'Insufficient wallet balance',
    action: 'Please top up your wallet to complete this purchase',
  },
  {
    pattern: /validation|invalid|required/i,
    message: 'Please check your input and try again',
    action: 'Make sure all required fields are filled correctly',
  },
  {
    pattern: /roi|minimum/i,
    message: 'You need to improve your ROI before selling paid coupons',
    action: 'Continue creating free picks to build your track record',
  },
  {
    pattern: /cannot purchase your own|own pick|own coupon|own slip/i,
    message: 'You cannot purchase your own coupon or slip',
    action: 'This is your own pick. You can view it in "My Picks" instead.',
  },
];

/**
 * Get user-friendly error message from technical error
 */
export function getUserFriendlyError(error: unknown): { message: string; action?: string } {
  const errorString = error instanceof Error ? error.message : String(error);
  
  // Check for exact matches first
  for (const mapping of errorMappings) {
    if (typeof mapping.pattern === 'string') {
      if (errorString.toLowerCase().includes(mapping.pattern.toLowerCase())) {
        return { message: mapping.message, action: mapping.action };
      }
    } else {
      if (mapping.pattern.test(errorString)) {
        return { message: mapping.message, action: mapping.action };
      }
    }
  }
  
  // Default fallback
  return {
    message: 'An unexpected error occurred',
    action: 'Please try again. If the problem persists, contact support',
  };
}

/**
 * Format error for display to user
 */
export function formatError(error: unknown): string {
  const { message, action } = getUserFriendlyError(error);
  return action ? `${message}. ${action}` : message;
}
