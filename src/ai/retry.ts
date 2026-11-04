export const maxRetries = 2;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function isRetryableStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

export async function readApiError(
  response: Response,
  provider: string,
): Promise<ApiRequestError> {
  let message = `${provider} API 请求失败（${response.status}）。`;
  let code: string | undefined;
  try {
    const data = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    message = data.error?.message || message;
    code = data.error?.code;
  } catch {
    // Keep the HTTP status message for non-JSON gateway errors.
  }
  return new ApiRequestError(message, response.status, code);
}

export async function fetchWithRetry(
  request: () => Promise<Response>,
  provider: string,
  passThrough404 = false,
): Promise<Response> {
  let lastError: Error = new Error(`${provider} 请求失败，请稍后重试。`);
  for (let retry = 0; retry <= maxRetries; retry += 1) {
    let response: Response;
    try {
      response = await request();
    } catch {
      lastError = new Error(
        `无法连接 ${provider} API，请检查网络或扩展主机权限。`,
      );
      if (retry < maxRetries) await delayForRetry(retry);
      continue;
    }

    if (response.ok || (passThrough404 && response.status === 404))
      return response;
    const apiError = await readApiError(response, provider);
    if (!isRetryableStatus(response.status)) throw apiError;
    lastError = apiError;
    if (retry < maxRetries)
      await delayForRetry(retry, response.headers.get('Retry-After'));
  }
  throw new Error(`${provider} 请求重试已用尽。${lastError.message}`);
}

function delayForRetry(
  retry: number,
  retryAfter: string | null = null,
): Promise<void> {
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
  const delayMs = Number.isFinite(retryAfterSeconds)
    ? Math.min(10_000, retryAfterSeconds * 1000)
    : Math.min(8_000, 1_000 * 2 ** retry);
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
