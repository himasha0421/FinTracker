export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

type RequestOptions = {
  method?: Method;
  data?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

function buildUrl(path: string, query?: RequestOptions['query']) {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const url = buildUrl(path, options.query);

  const res = await fetch(url, {
    method,
    headers: options.data ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
    credentials: options.credentials ?? 'include',
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (payload as any)?.error?.message || (payload as any)?.message || res.statusText;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
      throw new ApiError(response.status, errorMessage, errorJson);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(response.status, errorText || errorMessage);
    }
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || response.status === 204) {
    return null as T;
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text() as T;
}

export async function uploadFile(
  url: string,
  file: File,
  additionalFields?: Record<string, string>,
  headers?: Record<string, string>
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return fetchWithErrorHandling(url, {
    method: 'POST',
    headers,
    body: formData,
  });
}
