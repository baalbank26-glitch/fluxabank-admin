import { Fees } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

export const meService = {
  fees: async (): Promise<Fees> => {
    const response = await fetch(`${BASE_URL}/me/fees`, { headers: getHeaders() });
    const json = await handleResponse(response);
    return json?.data || { pixInPercent: 0, pixOutPercent: 0 };
  },

  wallet: {
    depositPix: async (amount: number) => {
      const response = await fetch(`${BASE_URL}/me/wallet/deposit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount, method: 'PIX' }),
      });
      const json = await handleResponse(response);
      return json?.data || {};
    },

    withdrawPix: async (amount: number, pixKey: string) => {
      const response = await fetch(`${BASE_URL}/me/wallet/withdraw`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount, pixKey, method: 'PIX' }),
      });
      const json = await handleResponse(response);
      return json?.data || {};
    },
  },
};

