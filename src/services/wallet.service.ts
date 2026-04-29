import { Wallet, LedgerItem } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

export const walletService = {
  get: async (userId: string | number): Promise<Wallet> => {
    const response = await fetch(`${BASE_URL}/admin/wallet/${userId}`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);

    return (
      json?.data || {
        id: 0,
        user_id: userId,
        balance: 0,
        currency: 'BRL'
      }
    );
  },

  getLedger: async (userId: string | number): Promise<LedgerItem[]> => {
    const response = await fetch(`${BASE_URL}/admin/wallet/${userId}/ledger`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);
    const data = json?.data || [];

    return Array.isArray(data) ? data : data.items || [];
  },

  adjustBalance: async (userId: string | number, type: 'CREDIT' | 'DEBIT', amount: number) => {
    const response = await fetch(`${BASE_URL}/admin/wallet/${userId}/balance`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ type, amount }),
    });

    const json = await handleResponse(response);
    return json?.data || null;
  },
};

