function baseUrl(): string {
  const url = process.env.COACH_MEMORY_URL;
  if (!url) throw new Error("COACH_MEMORY_URL is not set");
  return url;
}

function apiKey(): string {
  const key = process.env.COACH_SYNC_API_KEY;
  if (!key) throw new Error("COACH_SYNC_API_KEY is not set");
  return key;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, baseUrl());
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "x-api-key": apiKey() } });
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = new URL(path, baseUrl());
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey() },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}
