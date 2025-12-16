/// <reference lib="dom" />

type ActionResult<T = any> = Promise<{
  data?: T;
  error?: { message: string; status?: number };
  status: 'ok' | 'error';
}>;

type ActionArgs = Record<string, any> | FormData;

interface CallActionOptions {
  /**
   * Request timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Makes an authenticated action request to the Fern PHP framework.
 *
 * This function handles communication between the frontend and Fern backend actions,
 * automatically adding CSRF protection via nonces and setting appropriate headers.
 *
 * @template T - The expected response data type
 * @param {string} action - The action name to call (e.g., 'addToCart', 'login')
 * @param {ActionArgs} args - The action arguments as an object or FormData instance
 * @param {string} nonce - CSRF nonce token for security (obtain from backend)
 * @param {CallActionOptions} options - Optional configuration (timeout, etc.)
 * @returns {ActionResult<T>} Promise resolving to { data, status, error }
 *
 * @example
 * ```typescript
 * // Simple object arguments
 * const result = await callAction<{ cart: Cart }>(
 *   'addToCart',
 *   { product_id: 123, quantity: 2 },
 *   getNonce()
 * );
 *
 * if (result.status === 'ok') {
 *   console.log(result.data.cart);
 * } else {
 *   console.error(result.error.message);
 * }
 *
 * // Using FormData for file uploads
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * const uploadResult = await callAction('uploadFile', formData, getNonce());
 *
 * // With custom timeout
 * const slowResult = await callAction(
 *   'generateReport',
 *   { reportType: 'annual' },
 *   getNonce(),
 *   { timeout: 60000 } // 60 seconds
 * );
 * ```
 */
export const callAction = async <T>(
  action: string,
  args: ActionArgs = {},
  nonce: string = '',
  options: CallActionOptions = {}
): ActionResult<T> => {
  if (typeof window === 'undefined') {
    return {
      error: { message: 'you can only call actions from the browser', status: 400 },
      status: 'error',
    };
  }

  // Validate that request is same-origin for security
  const url = new URL(window.location.href);
  if (url.origin !== window.origin) {
    return {
      error: { message: 'Cross-origin action requests not allowed', status: 403 },
      status: 'error',
    };
  }

  // Setup timeout abort controller
  const controller = new AbortController();
  const timeout = options.timeout || 30000; // Default 30 seconds
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let body: string | FormData;
    let headers: Record<string, string> = {};

    if (args instanceof FormData) {
      // Add action and nonce to FormData at top level and in args
      args.append('action', action);
      if (nonce) {
        args.append('_nonce', nonce);
        args.append('args[_nonce]', nonce);
      }
      body = args;
    } else {
      // Defensive type checking to prevent invalid args
      if (typeof args === 'string') {
        console.error('[Fern] callAction received string instead of object:', args);
        args = {};
      } else if (args === null || args === undefined) {
        console.warn('[Fern] callAction received null/undefined, using empty object');
        args = {};
      }

      // Include _nonce in both top level and inside args
      const argsWithNonce = nonce ? { ...args, _nonce: nonce } : args;
      body = JSON.stringify({ action, args: argsWithNonce, _nonce: nonce });
      headers['Content-Type'] = 'application/json';
    }

    headers['X-Fern-Action'] = '';
    const res = await fetch(window.location.href, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const httpError = new Error(`HTTP error ${res.status}`) as Error & { status: number };
      httpError.status = res.status;
      throw httpError;
    }

    const contentType = res.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await res.json()
      : await res.text();

    return { data, status: 'ok' };
  } catch (err) {
    clearTimeout(timeoutId);

    // Handle abort errors (timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        error: {
          message: `Request timeout after ${timeout}ms`,
          status: 408,
        },
        status: 'error',
      };
    }

    // Preserve HTTP status from response errors
    const status = (err as any).status || 500;
    const message = err instanceof Error ? err.message : 'Request failed';

    return {
      error: { message, status },
      status: 'error',
    };
  }
};