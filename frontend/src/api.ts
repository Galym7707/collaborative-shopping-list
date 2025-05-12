// File: frontend/src/api.ts
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
  
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
        ...options,
        headers,
      });
  
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error ${response.status}`);
      }
  
      return response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch');
    }
  }