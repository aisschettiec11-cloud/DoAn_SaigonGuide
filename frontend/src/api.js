export async function api(path, options = {}) {
  const { token, ...rest } = options;
  const response = await fetch("/api" + path, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      message = (await response.json()).message || message;
    } catch {
      /* gateway response */
    }
    const e = new Error(message);
    e.status = response.status;
    throw e;
  }
  return response.status === 204 ? null : response.json();
}
export const post = (path, data, token) =>
  api(path, { method: "POST", body: JSON.stringify(data), token });
export function sessionId() {
  let s = sessionStorage.getItem("guide-session");
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem("guide-session", s);
  }
  return s;
}
