// Base URL of your FastAPI backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";



// Reusable fetch wrapper that handles JSON headers and error messages
export async function apiRequest(endpoint, options = {}) {
    const config = { ...options };

    if (options.body && typeof options.body === "object") {
        config.headers = {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        };
        config.body = JSON.stringify(options.body);
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (err) {
        throw new Error(`Cannot reach weather backend at ${API_BASE_URL}. Is the server running?`);
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        // Response had no JSON body
    }

    if (!response.ok) {
        let errorMsg = data && data.detail;
        if (Array.isArray(errorMsg)) {
            errorMsg = errorMsg.map((e) => e.msg).join("; ");
        }
        throw new Error(errorMsg || `Request failed with status ${response.status}`);
    }

    return data;
}





// Weather endpoints
export const fetchCurrentWeather = (location) =>
    apiRequest(`/weather?location=${encodeURIComponent(location)}`);

export const fetchForecast = (location) =>
    apiRequest(`/forecast?location=${encodeURIComponent(location)}`);

// Database CRUD endpoints
export const fetchRecords = () => apiRequest("/records");

export const createRecord = (body) =>
    apiRequest("/records", { method: "POST", body });

export const updateRecord = (id, body) =>
    apiRequest(`/records/${id}`, { method: "PUT", body });

export const deleteRecord = (id) =>
    apiRequest(`/records/${id}`, { method: "DELETE" });

export const fetchRecordExtras = (id) =>
    apiRequest(`/records/${id}/extras`);