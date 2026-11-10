// Every call spp-commerce makes outside the store goes through outboundJson (row 096). The store does not limit a
// package's network: the "externalNetwork" permission is checked by `znode check` / the marketplace review, but an
// install without it still goes through and the call still runs. So the plugin keeps its own rules here:
//   - only the hosts listed in OUTBOUND_HOSTS, over https (no shopper-supplied URL can send it elsewhere)
//   - a timeout (5 s by default) and a size cap on the answer (64 KB), so a slow or huge answer cannot hold the route
//   - no cookies, no store headers, no keys unless the caller passes them for that host
// Callers get the JSON or an OutboundError; they decide what the shopper sees.

export const OUTBOUND_HOSTS = ["api.zippopotam.us"] as const;

export class OutboundError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "OutboundError";
    this.status = status;
  }
}

/** Whether the plugin may call this URL: https and a host it lists. */
export function allowedUrl(url: string, hosts: readonly string[] = OUTBOUND_HOSTS) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && hosts.includes(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export async function outboundJson<T = unknown>(url: string, options: { timeoutMs?: number; maxBytes?: number; headers?: Record<string, string> } = {}): Promise<{ status: number; data: T | null }> {
  if (!allowedUrl(url)) throw new OutboundError(`Not an allowed host: ${url}`);
  const { timeoutMs = 5000, maxBytes = 64 * 1024, headers = {} } = options;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "error", headers: { Accept: "application/json", ...headers } });
  } catch (error) {
    throw new OutboundError(error instanceof Error && error.name === "TimeoutError" ? `Timed out after ${timeoutMs} ms` : "Unreachable");
  }
  const length = Number(response.headers.get("content-length"));
  if (length > maxBytes) throw new OutboundError(`Answer too large (${length} bytes)`, response.status);
  const text = await response.text();
  if (text.length > maxBytes) throw new OutboundError(`Answer too large (${text.length} bytes)`, response.status);
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    throw new OutboundError("Not JSON", response.status);
  }
  return { status: response.status, data };
}
