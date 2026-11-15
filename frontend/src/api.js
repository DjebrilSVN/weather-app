/**
 * API Service Client
 * Handles communication with the FastAPI backend.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function request(endpoint, options = {}) {
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
  } catch (networkError) {
    throw new Error(
      `Cannot connect to the weather backend at ${API_BASE_URL}. Ensure the server is running.`
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Response had no JSON body
  }

  if (!response.ok) {
    let errorMsg = data?.detail;
    if (Array.isArray(errorMsg)) {
      // Pydantic validation error array
      errorMsg = errorMsg.map((err) => `${err.loc?.slice(-1)[0]}: ${err.msg}`).join("; ");
    }
    throw new Error(errorMsg || `Request failed with status ${response.status}`);
  }

  return data;
}

// Weather endpoints
export const fetchCurrentWeather = (location) =>
  request(`/weather?location=${encodeURIComponent(location)}`);

export const fetchForecast = (location) =>
  request(`/forecast?location=${encodeURIComponent(location)}`);

// Database CRUD endpoints
export const fetchRecords = () => request("/records");

export const createRecord = (payload) =>
  request("/records", { method: "POST", body: payload });

export const updateRecord = (id, payload) =>
  request(`/records/${id}`, { method: "PUT", body: payload });

export const deleteRecord = (id) =>
  request(`/records/${id}`, { method: "DELETE" });

export const fetchRecordExtras = (id) =>
  request(`/records/${id}/extras`);
