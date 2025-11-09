/**
 * Cookie utility functions for managing authentication tokens
 */

export const setCookie = (name: string, value: string, days: number = 7): void => {
  if (typeof window === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const sameSite = '; SameSite=Strict';

  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/${secure}${sameSite}`;
};

export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }

  return null;
};

export const deleteCookie = (name: string): void => {
  if (typeof window === 'undefined') return;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};
