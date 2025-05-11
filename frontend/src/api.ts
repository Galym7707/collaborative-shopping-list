// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\api.ts
// VITE_API_URL должен быть определен в переменных окружения Vercel
const API_BASE_URL = import.meta.env.VITE_API_URL;
console.log(`[API Wrapper] Initial API_BASE_URL from env: ${API_BASE_URL}`);

if (!API_BASE_URL) {
    const message = "[API Wrapper] FATAL ERROR: VITE_API_URL is not defined in .env or environment variables.";
    console.error(message);
    // В разработке можно выбросить ошибку, чтобы сразу заметить
    if (import.meta.env.DEV) {
        // alert(message); // Для наглядности в разработке
    }
    // Для продакшена можно пытаться работать с относительным путем или показать ошибку пользователю
}

export async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('authToken');
    // Создаем объект для заголовков
    const requestHeaders: Record<string, string> = { ...options.headers };

    if (options.body && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
    }
    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const requestUrl = `${API_BASE_URL || ''}${path}`; // Добавляем || '' на случай, если API_BASE_URL не определен
    const requestOptions: RequestInit = {
        ...options,
        headers: requestHeaders,
    };

    console.log(`[API Wrapper] Making ${options.method || 'GET'} request to: ${requestUrl}`);
    console.log(`[API Wrapper] Request options:`, {
        method: requestOptions.method,
        headers: requestHeaders, // Логируем объект заголовков
        body: requestOptions.body // Логируем тело, если оно есть
    });

    let response: Response;

    try {
        response = await fetch(requestUrl, requestOptions);
        console.log(`[API Wrapper] Response received from ${requestUrl}: Status ${response.status}`);

        if (response.status === 401) { // Обработка 401 (например, токен истек)
            console.warn('[API Wrapper] Received 401 Unauthorized. Clearing token and redirecting to login.');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser'); // Также очищаем пользователя
            // Вместо window.location.replace лучше использовать navigate из react-router-dom,
            // но api.ts не является React компонентом.
            // Это можно обработать выше, в AuthContext или в сторе.
            // Пока просто выбрасываем ошибку.
            if (typeof window !== 'undefined') { // Проверка, что код выполняется в браузере
                 window.location.href = '/login?sessionExpired=1'; // Простой редирект
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
        try {
            errorData = await response.json();
            console.log(`[API Wrapper] Error response body from ${requestUrl}:`, errorData);
        } catch (e) {
            console.warn(`[API Wrapper] Could not parse error response body for ${requestUrl} (Status: ${response.status})`, e);
            errorData.message = response.statusText || errorData.message;
        }
        const error = new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        (error as any).response = response;
        (error as any).data = errorData;
        console.error(`[API Wrapper] HTTP error from ${requestUrl}: ${response.status}`, errorData);
        throw error;
    }

    if (response.status === 204) {
        console.log(`[API Wrapper] Received 204 No Content from ${requestUrl}`);
        return null as T;
    }

    try {
        const responseData = await response.json() as T;
        console.log(`[API Wrapper] Success response data from ${requestUrl}:`, JSON.stringify(responseData).substring(0, 200) + '...');
        return responseData;
    } catch (parseError) {
         console.error(`[API Wrapper] Error parsing JSON response from ${requestUrl}:`, parseError);
         const error = new Error('Failed to parse server response.');
         (error as any).response = response;
         throw error;
    }
}