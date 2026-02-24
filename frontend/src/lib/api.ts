/**
 * CleanDerect CRM — Axios API Client
 *
 * Base instance targeting Django backend.
 * Automatically attaches JWT access token from NextAuth session.
 */

import axios from "axios";
import { getSession } from "next-auth/react";

const api = axios.create({
    baseURL: "http://localhost:8000/api/",
    headers: {
        "Content-Type": "application/json",
    },
});

// ── Request interceptor: attach Bearer token ──
api.interceptors.request.use(async (config) => {
    const session = await getSession();

    if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
    }

    return config;
});

// ── Response interceptor: normalise errors ────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // You can add global error handling / token refresh logic here
        if (error.response?.status === 401) {
            // Token expired — could trigger a sign-out or refresh
            console.error("Unauthorized — token may have expired.");
        }
        return Promise.reject(error);
    }
);

export default api;
