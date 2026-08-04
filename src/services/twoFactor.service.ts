import { BASE_URL, getHeaders, handleResponse } from './config';

const API_BASE = `${BASE_URL}/admin/2fa`;

export interface AdminTwoFactorStatus {
  ok: boolean;
  enabled: boolean;
  verified?: boolean;
  method?: string | null;
  recoveryCodesCount?: number;
}

export const twoFactorService = {
  async status(): Promise<AdminTwoFactorStatus> {
    const res = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(res);
    if (!data) throw new Error('Falha ao obter status 2FA');
    return data;
  },

  async setup(): Promise<{ ok: boolean; secret: string; qrCode: string; otpAuthUrl: string; manualEntryKey: string }> {
    const res = await fetch(`${API_BASE}/setup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ method: 'TOTP' }),
    });
    const data = await handleResponse(res);
    if (!data) throw new Error('Falha ao iniciar configuração 2FA');
    return data;
  },

  async enable(code: string): Promise<{ ok: boolean; enabled: boolean; recoveryCodes: string[] }> {
    const res = await fetch(`${API_BASE}/enable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    const data = await handleResponse(res);
    if (!data) throw new Error('Falha ao ativar 2FA');
    return data;
  },

  async disable(payload: { code?: string; recoveryCode?: string }) {
    const res = await fetch(`${API_BASE}/disable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    if (!data) throw new Error('Falha ao desativar 2FA');
    return data;
  },

  async verify(payload: { code?: string; recoveryCode?: string }) {
    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    if (!data) throw new Error('Código 2FA inválido');
    return data;
  },

  async generateRecoveryCodes(payload: { code?: string; recoveryCode?: string }) {
    const res = await fetch(`${API_BASE}/recovery-codes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    if (!data) throw new Error('Falha ao gerar códigos de recuperação');
    return data as { ok: boolean; recoveryCodes: string[] };
  },
};
