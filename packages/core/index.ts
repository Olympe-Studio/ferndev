/// <reference lib="dom" />

type ActionResult<T = any> = Promise<{
  data?: T;
  error?: { message: string; status?: number };
  status: 'ok' | 'error';
}>;

type ActionArgs = Record<string, any> | FormData;

export const callAction = async <T>(
  action: string,
  args: ActionArgs = {},
  nonce: string = ''
): ActionResult<T> => {
  if (typeof window === 'undefined') {
    return {
      error: { message: 'you can only call actions from the browser', status: 400 },
      status: 'error',
    };
  }

  try {
    let body: string | FormData;
    let headers: Record<string, string> = {};

    if (args instanceof FormData) {
      // Add action and nonce to FormData if provided
      args.append('action', action);
      if (nonce) args.append('_nonce', nonce);
      body = args;
    } else {
      body = JSON.stringify({ action, args, _nonce: nonce });
      headers['Content-Type'] = 'application/json';
    }

    headers['X-Fern-Action'] = '';
    const res = await fetch(`${window.location.href}`, {
      method: 'POST',
      headers,
      body,
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const contentType = res.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await res.json()
      : await res.text();

    return { data, status: 'ok' };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'Request failed',
        status: 500,
      },
      status: 'error',
    };
  }
};