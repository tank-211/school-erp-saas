/**
 * utils/sessionGuard.js — send the user back to login when the session ends.
 *
 * The API answers 401 once the login token has expired. Without this, every
 * page stayed open showing errors or empty tables. Covers both axios and fetch.
 */
import axios from 'axios';
import { clearToken, getToken } from './authToken';

let redirecting = false;

// API calls only; a wrong password on the login form is also a 401
const isProtectedApiCall = (url) => {
  const text = String(url || '');
  return text.includes('/api/') && !/\/api\/auth\/[^?]*login/.test(text);
};

const endSession = () => {
  if (redirecting || !getToken()) return;
  redirecting = true;
  clearToken();
  try {
    sessionStorage.setItem('session_expired', '1');
  } catch {
    // storage unavailable: the login page simply shows no notice
  }
  window.location.assign('/login');
};

export function installSessionGuard() {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && isProtectedApiCall(error.config?.url)) endSession();
      return Promise.reject(error);
    },
  );

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url;
    if (response.status === 401 && isProtectedApiCall(url)) endSession();
    return response;
  };
}
