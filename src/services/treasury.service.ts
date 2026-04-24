import { TreasuryBalance, LedgerItem, TreasurySummary, PaginatedTreasuryByUserSummary, PaginatedLedgerItems } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

const toQueryString = (params?: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = String(value).trim();
    if (!normalized || normalized === 'undefined' || normalized === 'null') return;
    search.set(key, normalized);
  });
  return search.toString();
};

export const treasuryService = {
  getBalance: async (): Promise<TreasuryBalance> => {
    const response = await fetch(`${BASE_URL}/admin/treasury/balance`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);
    const data = json?.data || {};

    return {
      amount: Number(data.balance ?? data.amount ?? 0),
      currency: data.currency || 'BRL',
    };
  },

  getLedger: async (params?: { limit?: number; from?: string; to?: string }): Promise<LedgerItem[]> => {
    const query = toQueryString(params as any);

    const response = await fetch(`${BASE_URL}/admin/treasury/ledger?${query}`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);
    const data = json?.data || [];

    return Array.isArray(data) ? data : data.items || [];
  },

  getDailySummary: async (from?: string, to?: string): Promise<TreasurySummary[]> => {
    const query = toQueryString({ from, to });

    const response = await fetch(`${BASE_URL}/admin/treasury/summary/daily?${query}`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);
    const data = json?.data || [];

    return Array.isArray(data) ? data : [];
  },

  getMonthlySummary: async (from?: string, to?: string): Promise<TreasurySummary[]> => {
    const query = toQueryString({ from, to });

    const response = await fetch(`${BASE_URL}/admin/treasury/summary/monthly?${query}`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);
    const data = json?.data || [];

    return Array.isArray(data) ? data : [];
  },

  getByUserSummary: async (params?: { from?: string; to?: string; page?: number; pageSize?: number }): Promise<PaginatedTreasuryByUserSummary> => {
    const query = toQueryString(params as any);

    const response = await fetch(`${BASE_URL}/admin/treasury/summary/by-user?${query}`, {
      headers: getHeaders(),
    });

    const json = await handleResponse(response);
    const data = json?.data || [];
    const meta = json?.meta || {};

    return {
      items: Array.isArray(data) ? data : [],
      meta: {
        page: Number(meta.page || 1),
        pageSize: Number(meta.pageSize || 20),
        total: Number(meta.total || 0),
        totalPages: Number(meta.totalPages || 1),
      }
    };
  },

  getByUserTransactions: async (userId: number, params?: { from?: string; to?: string; page?: number; pageSize?: number; flowType?: 'ALL' | 'PIX_IN' | 'PIX_OUT' }): Promise<PaginatedLedgerItems> => {
    const baseParams = {
      from: params?.from,
      to: params?.to,
      page: params?.page,
      pageSize: params?.pageSize,
    };

    const parsePaginatedLedger = (json: any): PaginatedLedgerItems => {
      const data = json?.data || [];
      const meta = json?.meta || {};

      return {
        items: Array.isArray(data) ? data : [],
        meta: {
          page: Number(meta.page || 1),
          pageSize: Number(meta.pageSize || 20),
          total: Number(meta.total || 0),
          totalPages: Number(meta.totalPages || 1),
        }
      };
    };

    const request = async (queryParams: Record<string, unknown>) => {
      const query = toQueryString(queryParams);
      const response = await fetch(`${BASE_URL}/admin/treasury/summary/by-user/${userId}/transactions?${query}`, {
        headers: getHeaders(),
      });

      // shouldRedirect=false: fail fast so we can try a fallback param strategy.
      const json = await handleResponse(response, false);
      return parsePaginatedLedger(json);
    };

    const flowType = params?.flowType;

    // Avoid sending ALL, because some backends don't accept this token.
    if (!flowType || flowType === 'ALL') {
      return request(baseParams);
    }

    try {
      // Prefer `type` first because some backends fail when receiving `flowType`.
      return await request({ ...baseParams, type: flowType });
    } catch (typeError) {
      // Fallback for backends that only accept `flowType`.
      return request({ ...baseParams, flowType });
    }
  },
};

