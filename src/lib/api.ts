export async function getJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({error: response.statusText}));
    throw Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}
