export class HttpError extends Error {
  public readonly status: number;
  public readonly url: string;
  public readonly bodyText?: string;

  constructor(opts: { status: number; url: string; message: string; bodyText?: string }) {
    super(opts.message);
    this.status = opts.status;
    this.url = opts.url;
    this.bodyText = opts.bodyText;
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  opts?: { timeoutMs?: number; headers?: Record<string, string> },
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(opts?.headers ?? {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new HttpError({
        status: res.status,
        url,
        message: `HTTP ${res.status} from ${url}`,
        bodyText,
      });
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(
  url: string,
  init?: RequestInit,
  opts?: { timeoutMs?: number; headers?: Record<string, string> },
): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(opts?.headers ?? {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new HttpError({
        status: res.status,
        url,
        message: `HTTP ${res.status} from ${url}`,
        bodyText,
      });
    }

    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadText(res: Response): Promise<string | undefined> {
  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

