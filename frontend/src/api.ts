// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL; // Убрали || 'http://localhost:5000/api'
console.log(`[API Wrapper] Initial API_BASE_URL from env: ${API_BASE_URL}`);

if (!API_BASE_URL) {
    console.error("[API Wrapper] FATAL ERROR: VITE_API_URL is not defined in .env");
    // В реальном приложении можно показать заглушку или выбросить ошибку
}

export async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('authToken');
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const requestUrl = `${API_BASE_URL}${path}`;
    const requestOptions = { ...options, headers };

    console.log(`[API Wrapper] Making ${options.method || 'GET'} request to: ${requestUrl}`);
    console.log(`[API Wrapper] Request options:`, {
        method: requestOptions.method,
        headers: Object.fromEntries(headers.entries()),
        body: requestOptions.body
    });

    let response: Response; // Выносим response наружу try/catch

    try {
        response = await fetch(requestUrl, requestOptions); // <-- Вызов fetch
        console.log(`[API Wrapper] Response received from ${requestUrl}: Status ${response.status}`);

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.replace('/login?expired=1');
            throw new Error('Unauthorized');
        }

    } catch (networkError: any) {
        // --- ЛОВИМ ОШИБКИ САМОГО FETCH (сеть, DNS, CORS и т.д.) ---
        console.error(`[API Wrapper] Network error fetching ${requestUrl}:`, networkError);
        // Создаем кастомную ошибку
        const error = new Error(`Network error: ${networkError.message || 'Failed to fetch'}`);
        (error as any).isNetworkError = true; // Добавим флаг
        throw error; // Выбрасываем ошибку сети
        // ---------------------------------------------------------
    }

    // Обработка ответа, если fetch НЕ выбросил ошибку сети
    if (!response.ok) {
        let errorData: any = { message: `Request failed with status ${response.status}` }; // Улучшенное сообщение по умолчанию
        try {
            errorData = await response.json();
            console.log(`[API Wrapper] Error response body from ${requestUrl}:`, errorData);
        } catch (e) {
            console.warn(`[API Wrapper] Could not parse error response body for ${requestUrl} (Status: ${response.status})`, e);
             // Если тело ошибки не JSON, используем статус-текст
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
        console.log(`[API Wrapper] Success response data from ${requestUrl}:`, JSON.stringify(responseData).substring(0, 200) + '...'); // Логируем часть данных
        return responseData;
    } catch (parseError) {
         console.error(`[API Wrapper] Error parsing JSON response from ${requestUrl}:`, parseError);
         const error = new Error('Failed to parse server response.');
         (error as any).response = response; // Прикрепляем ответ для отладки
         throw error;
    }
}