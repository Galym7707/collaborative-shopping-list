// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL;
console.log(`[API Wrapper] Initial API_BASE_URL from env: ${API_BASE_URL}`);

if (!API_BASE_URL && import.meta.env.DEV) {
    console.error("[API Wrapper] VITE_API_URL is not defined!");
}

export async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('authToken');
    // Используем Record<string, string> для requestHeaders, т.к. new Headers() может быть проблемой
    const requestHeaders: Record<string, string> = {};

    // Копируем существующие заголовки из options.headers
    if (options.headers) {
        if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => {
                requestHeaders[key] = value;
            });
        } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
                requestHeaders[key] = value;
            });
        } else { // Обычный объект
            Object.assign(requestHeaders, options.headers);
        }
    }

    if (options.body && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
    }
    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const requestUrl = `${API_BASE_URL || ''}${path}`;
    const requestOptions: RequestInit = {
        ...options,
        headers: requestHeaders,
    };

    console.log(`[API Wrapper] Making ${options.method || 'GET'} request to: ${requestUrl}`);
    console.log(`[API Wrapper] Request options:`, {
        method: requestOptions.method,
        headers: requestHeaders,
        body: requestOptions.body
    });

    let response: Response;

    try {
        response = await fetch(requestUrl, requestOptions);
        console.log(`[API Wrapper] Response received from ${requestUrl}: Status ${response.status}`);

        if (response.status === 401) {
            console.warn('[API Wrapper] Received 401 Unauthorized. Clearing token.');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
                 window.location.href = '/login?sessionExpired=1&reason=api_401';
            }
            throw new Error('Session expired or unauthorized. Please log in again.');
        }

    } catch (networkError: any) {
        console.error(`[API Wrapper] Network error fetching ${requestUrl}:`, networkError);
        const error = new Error(`Network error: ${networkError.message || 'Failed to fetch'}`);
        (error as any).isNetworkError = true;
        throw error;
    }

    if (!response.ok) {
        let errorData: any = { message: `Request failed with status ${response.status}` };
        try { errorData = await response.json(); } catch (e) { errorData.message = response.statusText || errorData.message; }
        const error = new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        (error as any).response = response; (error as any).data = errorData;
        console.error(`[API Wrapper] HTTP error from ${requestUrl}: ${response.status}`, errorData);
        throw error;
    }

    if (response.status === 204) return null as T;

    try {
        const responseData = await response.json() as T;
        console.log(`[API Wrapper] Success response data from ${requestUrl}:`, JSON.stringify(responseData).substring(0, 200) + '...');
        return responseData;
    } catch (parseError) {
         console.error(`[API Wrapper] Error parsing JSON response from ${requestUrl}:`, parseError);
         const error = new Error('Failed to parse server response.');
         (error as any).response = response; throw error;
    }
}