import { Provider } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

export const providersService = {
  list: async (): Promise<Provider[]> => {
    const response = await fetch(`${BASE_URL}/admin/providers`, { headers: getHeaders() });
    const json = await handleResponse(response);
    return Array.isArray(json?.data) ? json.data : [];
  },

  get: async (id: string | number): Promise<Provider | null> => {
    const response = await fetch(`${BASE_URL}/admin/providers/${id}`, { headers: getHeaders() });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  create: async (data: { code: string; name: string; base_url: string; active?: boolean }): Promise<Provider | null> => {
    const response = await fetch(`${BASE_URL}/admin/providers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  update: async (id: string | number, data: { code?: string; name?: string; base_url?: string }): Promise<Provider | null> => {
    const response = await fetch(`${BASE_URL}/admin/providers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  updateStatus: async (id: string | number, active: boolean): Promise<Provider | null> => {
    const response = await fetch(`${BASE_URL}/admin/providers/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ active }),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  delete: async (id: string | number): Promise<boolean> => {
    const response = await fetch(`${BASE_URL}/admin/providers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    return json !== null;
  },
};

