import { BASE_URL, TOKEN_KEY, handleResponse } from './config';

export const authService = {
  login: async (email: string, password: string, challenge?: { code?: string; recoveryCode?: string }) => {
    const response = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        ...(challenge?.code ? { code: challenge.code } : {}),
        ...(challenge?.recoveryCode ? { recoveryCode: challenge.recoveryCode } : {}),
      }),
    });

    // Não redireciona durante o login, apenas lança erro para ser tratado no componente
    const json = await handleResponse(response, false);

    const payload = json.data || json;

    if (payload.token) {
      localStorage.setItem(TOKEN_KEY, payload.token);
    }

    return payload;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getProfile: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },
};

