export const API_BASE = "http://localhost:8010/api";

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
