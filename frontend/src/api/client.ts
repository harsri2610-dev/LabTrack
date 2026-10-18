import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // needed so the httpOnly refresh-token cookie is sent
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Transparent refresh: on a 401, try once to refresh the access token via the
// refresh cookie, then replay the original request.
let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const authEndpoint = original?.url?.replace(/\/+$/, "");
    const shouldSkipRefresh = authEndpoint?.endsWith("/auth/login")
      || authEndpoint?.endsWith("/auth/face-login")
      || authEndpoint?.endsWith("/auth/refresh");
    if (error.response?.status === 401 && original && !original._retry && !shouldSkipRefresh) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = apiClient.post("/auth/refresh").then((r) => {
            const token = r.data.accessToken as string;
            setAccessToken(token);
            return token;
          }).finally(() => {
            refreshPromise = null;
          });
        }
        const token = await refreshPromise;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);
