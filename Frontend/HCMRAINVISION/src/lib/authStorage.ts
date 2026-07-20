/**
 * Token storage for API client. AuthContext writes here; apiClient reads.
 */
import { STORAGE_KEYS } from '../constants';

let inMemoryToken: string | null = null;

export function getToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const sessionToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    if (sessionToken) return sessionToken;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

export function setToken(token: string, persist: boolean): void {
  inMemoryToken = token;
  try {
    if (persist) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  inMemoryToken = null;
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch {
    /* ignore */
  }
}
