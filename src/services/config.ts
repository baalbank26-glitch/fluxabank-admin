
const getBaseUrl = (): string => {
  const ls = (typeof window !== 'undefined') ? (localStorage.getItem('admin_api_base') || '') : '';
  const win = (typeof window !== 'undefined' && (window as any).__ADMIN_API_BASE__) || '';
  const base = (ls || win || 'https://api.baalbank.com/api').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export const BASE_URL = getBaseUrl();
export const API_USER_SERVICE = BASE_URL; // Using BASE_URL as API_USER_SERVICE for compatibility
export const TOKEN_KEY = 'mutual_token_admin';

let isRedirecting = false;

export const getHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const handleResponse = async (response: Response, shouldRedirect: boolean = true) => {
  const isUnauthorized = response.status === 401;
  const isForbidden = response.status === 403;

  if (isUnauthorized) {
    localStorage.removeItem(TOKEN_KEY);

    // Se não deve redirecionar (ex: durante login), lança erro para ser tratado
    if (!shouldRedirect) {
      try {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Credenciais inválidas');
      } catch (err: any) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error('Credenciais inválidas');
      }
    }

    // Se deve redirecionar (comportamento padrão), redireciona e retorna null
    if (!isRedirecting) {
      isRedirecting = true;
      window.location.href = "/";
    }
    return null;
  }

  if (isForbidden) {
    const errorData = await response.json().catch(() => ({}));

    if (!shouldRedirect) {
      throw new Error(errorData.message || errorData.error || 'Voce nao possui permissao para esta acao');
    }

    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro na requisição' }));
    if (!shouldRedirect) {
      throw new Error(error?.message || error?.error || 'Erro na requisição');
    }
    return null;
  }

  // Handle 204 No Content or empty bodies safely
  if (response.status === 204) return {};

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    // If response was OK but JSON parse failed, return empty object to indicate success
    return {};
  }
};

