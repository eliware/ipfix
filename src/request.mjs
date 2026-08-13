export function joinUrl(base, apiPath) {
  if (/^[a-z][a-z\d+.-]*:/i.test(apiPath) || apiPath.startsWith('//')) throw new Error('API paths must be relative');
  return `${base.replace(/\/$/, '')}/${apiPath.replace(/^\//, '')}`;
}

export async function requestJson(url, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const error = new Error(`API request failed with HTTP ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return { body, status: response.status, durationMs: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestText(url, options = {}) { return requestJson(url, options); }
