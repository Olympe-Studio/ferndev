/// <reference lib="dom" />

/**
 * Result envelope returned by every {@link callAction} request.
 *
 * @template TData - The expected response data type. Defaults to `unknown`, which forces
 * the caller to pass a type argument (`callAction<MyType>(...)`) or narrow before use.
 */
export interface ActionResult<TData = unknown> {
  data?: TData;
  error?: { message: string; status?: number };
  status: 'ok' | 'error';
}

/**
 * Arguments accepted by {@link callAction}. Either a plain object or a `FormData` instance.
 *
 * The args type is bound to `object | FormData` (not `Record<string, unknown>`) so that a
 * consumer's own `interface` types are accepted — interfaces lack an implicit index
 * signature and would otherwise be rejected by a `Record` constraint.
 */
export type ActionArgs = Record<string, unknown> | FormData;

/**
 * Optional configuration for {@link callAction}.
 */
export interface CallActionOptions {
  /**
   * Request timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Makes an authenticated action request to the Fern PHP framework.
 *
 * Handles communication between the frontend and Fern backend actions, automatically
 * adding CSRF protection via nonces and setting appropriate headers.
 *
 * @template TData - The expected response data type (defaults to `unknown`).
 * @template TArgs - The args shape; supply it to type-check the payload at the call site.
 * @param action - The action name to call (e.g. `'addToCart'`, `'login'`).
 * @param args - The action arguments as an object or `FormData` instance.
 * @param nonce - CSRF nonce token for security (obtain from backend).
 * @param options - Optional configuration (timeout, etc.).
 * @returns Promise resolving to `{ data?, error?, status }`.
 *
 * @example
 * ```typescript
 * interface AddToCartArgs { product_id: number; quantity: number }
 *
 * const result = await callAction<{ cart: Cart }, AddToCartArgs>(
 *   'addToCart',
 *   { product_id: 123, quantity: 2 },
 *   getNonce(),
 * );
 *
 * if (result.status === 'ok') {
 *   console.log(result.data?.cart);
 * } else {
 *   console.error(result.error?.message);
 * }
 * ```
 */
export async function callAction<
  TData = unknown,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- intentional: TArgs lets callers type-check the args payload via callAction<Data, Args>
  TArgs extends object | FormData = Record<string, unknown>,
>(
  action: string,
  args?: TArgs,
  nonce = '',
  options: CallActionOptions = {},
): Promise<ActionResult<TData>> {
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
  const timeout = options.timeout ?? 30000; // Default 30 seconds
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    let body: string | FormData;
    const headers: Record<string, string> = {};

    if (args instanceof FormData) {
      // Add action and nonce to FormData at top level and in args
      args.append('action', action);
      if (nonce) {
        args.append('_nonce', nonce);
        args.append('args[_nonce]', nonce);
      }
      body = args;
    } else {
      // Include _nonce in both top level and inside args
      const objectArgs = (args ?? {}) as Record<string, unknown>;
      const argsWithNonce = nonce ? { ...objectArgs, _nonce: nonce } : objectArgs;
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
    const data = (contentType?.includes('application/json')
      ? await res.json()
      : await res.text()) as TData;

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
    const status =
      err instanceof Error && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : 'Request failed';

    return {
      error: { message, status },
      status: 'error',
    };
  }
}

/**
 * Binds an action name to its argument and response types once, returning a fully typed
 * caller. The recommended way to consume actions: the action ↔ types binding lives in a
 * single local declaration, and every call site is then checked with no per-call generics
 * and no string to mistype.
 *
 * @template TArgs - The argument type for this action.
 * @template TData - The response data type for this action.
 * @param action - The action name to bind.
 * @returns A typed function `(args?, nonce?, options?) => Promise<ActionResult<TData>>`.
 *
 * @example
 * ```typescript
 * const addToCart = defineAction<{ product_id: number; quantity: number }, { cart: Cart }>('addToCart');
 *
 * const result = await addToCart({ product_id: 123, quantity: 2 });
 * result.data?.cart; // typed
 * ```
 */
export function defineAction<
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- intentional: TArgs binds the action's args type for callers
  TArgs extends object | FormData = Record<string, unknown>,
  TData = unknown,
>(
  action: string,
): (args?: TArgs, nonce?: string, options?: CallActionOptions) => Promise<ActionResult<TData>> {
  return (args, nonce, options) => callAction<TData, TArgs>(action, args, nonce, options);
}
