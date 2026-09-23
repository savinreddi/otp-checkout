const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResult {
  code: string;
}

export function registerUser(payload: RegisterPayload) {
  return request<RegisterResult>("/api/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function checkEmail(email: string) {
  return request<{ registered: boolean }>(
    `/api/users/check?email=${encodeURIComponent(email)}`
  );
}

export interface LoginResult {
  success: boolean;
  firstName?: string;
  lastName?: string;
  message?: string;
}

export function loginWithCode(email: string, code: string) {
  return request<LoginResult>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export interface CheckoutPayload {
  email: string;
  phone: string;
  shippingAddress: string;
  loggedIn: boolean;
}

export function submitCheckout(payload: CheckoutPayload) {
  return request<{ success: boolean; id: number }>("/api/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
