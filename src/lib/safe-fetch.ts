/**
 * Safe fetch helper that gracefully handles server errors.
 * When the server is down or returns HTML instead of JSON,
 * this returns null instead of throwing "Unexpected token '<'".
 */
export async function safeJsonFetch<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`API ${url} returned ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.warn(`API ${url} returned non-JSON content-type: ${contentType}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`API ${url} fetch failed:`, err);
    return null;
  }
}
