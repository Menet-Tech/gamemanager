const getApiBase = () => {
  // If Vite env VITE_API_BASE is defined (e.g. in .env file or build time), use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // If running behind a reverse proxy on standard HTTP/HTTPS ports (80/443), use same-origin relative path
  const { protocol, hostname, port } = window.location;
  if (!port || port === '80' || port === '443') {
    return '/api';
  }
  
  // Otherwise, default to port 8010 on the same host (useful for local development/direct IP testing)
  return `${protocol}//${hostname}:8010/api`;
};

export const API_BASE = getApiBase();

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    // Trigger window reload to redirect to login
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  // Handle DELETE or other methods that return empty 200/204 response
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    if (contentType && contentType.includes("application/json")) {
      const errData = await response.json().catch(() => ({}));
      errorMsg = errData.error || errorMsg;
    } else {
      const text = await response.text().catch(() => "");
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}
