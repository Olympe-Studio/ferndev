/// <reference lib="dom" />

type ActionResult<T = any> = Promise<{
  data?: T;
  error?: { message: string; status?: number };
  status: 'ok' | 'error';
}>;


export const callAction = async <T>(
  action: string,
  args: Record<string, any> = {},
  nonce = ''
): ActionResult<T> => {
  if (typeof window === 'undefined') {
    return {
      error: { message: 'you can only call actions from the browser', status: 400 },
      status: 'error',
    };
  }

  try {
    const res = await fetch(`${window.location.origin}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args, nonce }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    return { data: await res.json(), status: 'ok' };
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