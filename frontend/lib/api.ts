export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");


export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("billflow_token");
};

export const setToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("billflow_token", token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("billflow_token");
  }
};

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const authToken = getToken();

  const headers: Record<string, string> = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${cleanPath}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null as T;
  }

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        if (typeof errorJson.detail === "string") {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((e: any) => e.msg || e.message).join(", ");
        }
      }
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

api.get = <T = any>(path: string, options?: RequestInit) =>
  api<T>(path, { ...options, method: "GET" });

api.post = <T = any>(path: string, body?: any, options?: RequestInit) =>
  api<T>(path, {
    ...options,
    method: "POST",
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

api.put = <T = any>(path: string, body?: any, options?: RequestInit) =>
  api<T>(path, {
    ...options,
    method: "PUT",
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

api.patch = <T = any>(path: string, body?: any, options?: RequestInit) =>
  api<T>(path, {
    ...options,
    method: "PATCH",
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

api.delete = <T = any>(path: string, options?: RequestInit) =>
  api<T>(path, { ...options, method: "DELETE" });

export const apiUrl = API_BASE_URL;


export function money(amount: number, currency = "USD"): string {
  const cleanCurrency = (currency || "USD").toUpperCase().trim();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cleanCurrency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${cleanCurrency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Toast notification bus
type ToastType = "success" | "error" | "info";
type ToastListener = (toast: { id: string; message: string; type: ToastType }) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  subscribe(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  show(message: string, type: ToastType = "info") {
    const id = Math.random().toString(36).substring(2, 9);
    listeners.forEach((l) => l({ id, message, type }));
  },
  success(message: string) {
    this.show(message, "success");
  },
  error(message: string) {
    this.show(message, "error");
  },
  info(message: string) {
    this.show(message, "info");
  },
};

