import { TIMEOUT_MS } from "./config";

/** fetch com timeout via AbortController. Sempre limpa o timer (finally). */
export async function fetchComTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function foiTimeout(err: unknown): boolean {
  const nome = (err as { name?: string })?.name;
  return nome === "AbortError" || nome === "TimeoutError";
}
