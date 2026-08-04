import { BASE_URL, getHeaders, handleResponse } from './config';

export const settingsService = {
  getMaintenance: async () => {
    const response = await fetch(`${BASE_URL}/admin/settings/maintenance`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    // Default safe values
    return json?.data || { isActive: false, message: 'O sistema está em manutenção.', allowedUserIds: [] };
  },

  updateMaintenance: async (isActive: boolean, message: string, allowedUserIds: number[] = []) => {
    const response = await fetch(`${BASE_URL}/admin/settings/maintenance`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ isActive, message, allowedUserIds }),
    });
    const json = await handleResponse(response);
    // Retorna o objeto de resposta se não for null (sucesso)
    if (json) {
       return json.data || json; 
    }
    return null;
  },

  getWebhookSettings: async () => {
    const response = await fetch(`${BASE_URL}/admin/settings/webhooks`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    return json?.data || { webhooksDisabled: false };
  },

  updateWebhookSettings: async (webhooksDisabled: boolean) => {
    const response = await fetch(`${BASE_URL}/admin/settings/webhooks`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ webhooksDisabled }),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  }
};

