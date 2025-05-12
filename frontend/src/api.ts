// File: frontend/src/api.ts
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

if (!API_BASE_URL && import.meta.env.DEV) {
    console.error("[API] VITE_API_URL is not defined!");
}

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export async function api<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const authUserString = localStorage.getItem('authUser');
    if (authUserString) {
        try {
            const authUser = JSON.parse(authUserString);
            if (authUser?.token) {
                headers['Authorization'] = `Bearer ${authUser.token}`;
            }
        } catch (e) {
            console.error('Failed to parse authUser from localStorage:', e);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return response.json() as Promise<T>;
        }
        return {} as T;
    } catch (err: any) {
        const message = err.message || 'Failed to fetch data';
        toast.error(message);
        throw err;
    }
}